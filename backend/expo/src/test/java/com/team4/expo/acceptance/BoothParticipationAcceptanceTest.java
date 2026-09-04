package com.team4.expo.acceptance;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.team4.expo.domain.*;
import com.team4.expo.repository.BoothApplicationGroupRepository;
import com.team4.expo.repository.BoothApplicationRepository;
import com.team4.expo.repository.BoothRepository;
import com.team4.expo.repository.ExpoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest(webEnvironment =  SpringBootTest.WebEnvironment.DEFINED_PORT)
@ActiveProfiles("test")
public class BoothParticipationAcceptanceTest {

    private static final String EXPO_BASE_URL = "http://localhost:8082";
    private static final String PAYMENT_BASE_URL = "http://localhost:8083";

    @Autowired
    private ExpoRepository expoRepository;
    @Autowired
    private BoothRepository boothRepository;
    @Autowired
    private BoothApplicationRepository boothApplicationRepository;
    @Autowired
    private BoothApplicationGroupRepository boothApplicationGroupRepository;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void clean() {
        boothApplicationRepository.deleteAllInBatch();
        boothApplicationGroupRepository.deleteAllInBatch();
        boothRepository.deleteAllInBatch();
        expoRepository.deleteAllInBatch();
    }

    // ---------- 테스트 데이터 준비 ----------

    private Expo saveExpo() {
        LocalDateTime now = LocalDateTime.now();
        Expo expo = new Expo("참가 확정 Acceptance 테스트 박람회", "COEX", now.plusDays(30), now.plusDays(33),
                now.minusDays(5), now.plusDays(10));
        expo.open();
        return expoRepository.save(expo);
    }

    private Booth saveBooth(Expo expo, String boothNo, int fee) {
        return boothRepository.save(new Booth(expo, boothNo, "조립 부스", fee));
    }

    // 신청 그룹 + 신청 1건(SUBMITTED, 심사 대기)을 만든다.
    private BoothApplication saveSubmittedApplication(Expo expo, Booth booth, Long exhibitorId) {
        BoothApplicationGroup group = new BoothApplicationGroup(
                expo, exhibitorId, "전기차 충전기", "친환경 모빌리티 솔루션 전시",
                true, false, false, null);
        boothApplicationGroupRepository.save(group);
        return boothApplicationRepository.save(
                new BoothApplication(booth, group, exhibitorId, ApplicationStatus.SUBMITTED));
    }

    private void approve(Long applicationId) throws IOException, InterruptedException {
        HttpResponse<String> response = post(
                EXPO_BASE_URL + "/api/admin/booth-applications/" + applicationId + "/approve",
                "1", "ADMIN", null);
        assertEquals(200, response.statusCode(), "테스트 준비 단계인 승인 요청 자체가 실패했습니다: " + response.body());
    }

    // ---------- HTTP 헬퍼 ----------
    // Expo는 Gateway를 거치지 않고 X-User-Id / X-User-Role 헤더를 직접 보내는 방식으로 테스트한다.
    // (GatewayAuthenticationFilter가 이 두 헤더를 그대로 신뢰하는 구조 - 로컬/테스트 전용)

    private HttpResponse<String> get(String url, String userId, String role) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .header("X-User-Id", userId)
                .header("X-User-Role", role)
                .timeout(Duration.ofSeconds(5))
                .GET()
                .build();
        return httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> post(String url, String userId, String role, Object body) throws IOException, InterruptedException {
        String json = body == null ? "" : objectMapper.writeValueAsString(body);
        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .header("Content-Type", "application/json")
                .header("X-User-Id", userId)
                .header("X-User-Role", role)
                .timeout(Duration.ofSeconds(5))
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();
        return httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    }

    // Payment 서버는 Expo와 별개 서버라 미리 실행되어 있어야 하고, 인증 헤더 없이 순수 REST로 호출한다.
    private HttpResponse<String> payViaPaymentService(String groupId, Long userId, Long amount, String paymentId)
            throws IOException, InterruptedException {
        String json = objectMapper.writeValueAsString(new PayRequest(groupId, userId, amount, "CARD", paymentId));
        HttpRequest request = HttpRequest.newBuilder(URI.create(PAYMENT_BASE_URL + "/api/exhibitor/payments"))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(5))
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();
        return httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    }

    private record PayRequest(String bookingId, Long userId, Long amount, String payMethod, String paymentId) {
    }

    private record RejectRequest(String reason) {
    }

    // ---------- 시나리오 5 · 6: Admin의 신청 조회 / 승인 / 반려 ----------

    @Test
    void Admin은_접수된_신청을_조회하고_승인할_수_있다() throws Exception {
        Expo expo = saveExpo();
        Booth booth = saveBooth(expo, "A-101", 300_000);
        BoothApplication application = saveSubmittedApplication(expo, booth, 100L);

        // 시나리오 5: Admin의 부스 참가 신청 조회
        HttpResponse<String> listResponse = get(EXPO_BASE_URL + "/api/admin/booth-applications", "1", "ADMIN");
        assertEquals(200, listResponse.statusCode());
        JsonNode listBody = objectMapper.readTree(listResponse.body());
        assertEquals(1, listBody.path("data").path("content").size());
        assertEquals("SUBMITTED", listBody.path("data").path("content").get(0)
                .path("applications").get(0).path("status").asText());

        // 시나리오 6: Admin의 승인
        HttpResponse<String> approveResponse = post(
                EXPO_BASE_URL + "/api/admin/booth-applications/" + application.getId() + "/approve",
                "1", "ADMIN", null);
        assertEquals(200, approveResponse.statusCode());
        JsonNode approveBody = objectMapper.readTree(approveResponse.body());
        assertEquals("PAYMENT_PENDING", approveBody.path("data").path("status").asText());
    }

    @Test
    void Admin은_접수된_신청을_반려할_수_있다() throws Exception {
        Expo expo = saveExpo();
        Booth booth = saveBooth(expo, "A-102", 300_000);
        BoothApplication application = saveSubmittedApplication(expo, booth, 200L);

        HttpResponse<String> rejectResponse = post(
                EXPO_BASE_URL + "/api/admin/booth-applications/" + application.getId() + "/reject",
                "1", "ADMIN", new RejectRequest("서류 미비"));

        assertEquals(200, rejectResponse.statusCode());
        JsonNode body = objectMapper.readTree(rejectResponse.body());
        assertEquals("REJECTED", body.path("data").path("status").asText());
    }

    // ---------- 시나리오 7 · 8 · 9: 정상 결제 -> 참가 확정 -> 본인 상태 조회 ----------

    @Test
    void 승인된_신청은_결제_완료_후_참가가_확정되고_본인조회에_반영된다() throws Exception {
        Expo expo = saveExpo();
        Booth booth = saveBooth(expo, "B-201", 300_000);
        BoothApplication application = saveSubmittedApplication(expo, booth, 300L);
        String groupId = application.getGroup().getId();

        approve(application.getId());

        // 시나리오 7: 참가업체의 승인된 참가비 Mock 결제
        HttpResponse<String> payResponse = payViaPaymentService(groupId, 300L, 300_000L, "mock-" + UUID.randomUUID());
        assertEquals(200, payResponse.statusCode(), payResponse.body());
        JsonNode payBody = objectMapper.readTree(payResponse.body());
        assertEquals("PAID", payBody.path("status").asText());

        // 시나리오 8: 결제 완료 후 참가 확정 (Payment -> Expo 실제 HTTP 확정 통보가 DB에 반영됐는지 확인)
        BoothApplication updated = boothApplicationRepository.findById(application.getId()).orElseThrow();
        assertEquals(ApplicationStatus.CONFIRMED, updated.getStatus());
        Booth updatedBooth = boothRepository.findById(booth.getId()).orElseThrow();
        assertEquals(BoothStatus.ASSIGNED, updatedBooth.getStatus());

        // 시나리오 9: 참가업체의 본인 신청·결제 상태 조회
        HttpResponse<String> myResponse = get(EXPO_BASE_URL + "/api/exhibitor/booth-applications", "300", "EXHIBITOR");
        assertEquals(200, myResponse.statusCode());
        JsonNode myGroup = objectMapper.readTree(myResponse.body()).path("data").path("content").get(0);
        assertEquals("PAID", myGroup.path("paymentStatus").asText());
        assertEquals("CONFIRMED", myGroup.path("applications").get(0).path("status").asText());
    }

    // ---------- 실패 흐름 ----------

    @Test
    void 승인되지_않은_신청은_결제할_수_없다() throws Exception {
        Expo expo = saveExpo();
        Booth booth = saveBooth(expo, "C-301", 300_000);
        BoothApplication application = saveSubmittedApplication(expo, booth, 400L);
        // 일부러 승인하지 않고(SUBMITTED 상태 그대로) 바로 결제 시도

        HttpResponse<String> payResponse = payViaPaymentService(
                application.getGroup().getId(), 400L, 300_000L, "mock-" + UUID.randomUUID());

        assertEquals(409, payResponse.statusCode(), payResponse.body());
    }

    @Test
    void 참가비와_다른_금액으로_결제하면_실패하고_확정되지_않는다() throws Exception {
        Expo expo = saveExpo();
        Booth booth = saveBooth(expo, "C-302", 300_000);
        BoothApplication application = saveSubmittedApplication(expo, booth, 500L);
        approve(application.getId());

        HttpResponse<String> payResponse = payViaPaymentService(
                application.getGroup().getId(), 500L, 999_999L, "mock-" + UUID.randomUUID());

        assertEquals(400, payResponse.statusCode(), payResponse.body());

        BoothApplication unchanged = boothApplicationRepository.findById(application.getId()).orElseThrow();
        assertEquals(ApplicationStatus.PAYMENT_PENDING, unchanged.getStatus());
    }

    @Test
    void 같은_신청에_대한_중복_결제는_차단된다() throws Exception {
        Expo expo = saveExpo();
        Booth booth = saveBooth(expo, "C-303", 300_000);
        BoothApplication application = saveSubmittedApplication(expo, booth, 600L);
        String groupId = application.getGroup().getId();
        approve(application.getId());

        HttpResponse<String> firstPay = payViaPaymentService(groupId, 600L, 300_000L, "mock-" + UUID.randomUUID());
        assertEquals(200, firstPay.statusCode(), firstPay.body());

        HttpResponse<String> secondPay = payViaPaymentService(groupId, 600L, 300_000L, "mock-" + UUID.randomUUID());
        assertEquals(409, secondPay.statusCode(), secondPay.body());
    }

    @Test
    void 결제가_실패하면_참가는_확정되지_않는다() throws Exception {
        Expo expo = saveExpo();
        Booth booth = saveBooth(expo, "C-304", 300_000);
        BoothApplication application = saveSubmittedApplication(expo, booth, 700L);
        approve(application.getId());

        // paymentId를 FORCE_FAIL로 시작하게 보내면 MockPaymentGateway가 일부러 실패 처리한다 (테스트 전용 트리거).
        HttpResponse<String> payResponse = payViaPaymentService(
                application.getGroup().getId(), 700L, 300_000L, "FORCE_FAIL-" + UUID.randomUUID());

        // 결제 API 자체는 예외 없이 200으로 응답하되, 응답 본문의 status가 FAILED로 내려온다.
        assertEquals(200, payResponse.statusCode(), payResponse.body());
        JsonNode payBody = objectMapper.readTree(payResponse.body());
        assertEquals("FAILED", payBody.path("status").asText());

        // Expo는 확정 통보를 받지 못했으므로 그대로 PAYMENT_PENDING / RESERVED 상태여야 한다.
        BoothApplication unchanged = boothApplicationRepository.findById(application.getId()).orElseThrow();
        assertEquals(ApplicationStatus.PAYMENT_PENDING, unchanged.getStatus());
        Booth unchangedBooth = boothRepository.findById(booth.getId()).orElseThrow();
        assertEquals(BoothStatus.RESERVED, unchangedBooth.getStatus());
    }
}
