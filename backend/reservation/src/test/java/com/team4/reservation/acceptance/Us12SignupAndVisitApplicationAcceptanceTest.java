package com.team4.reservation.acceptance;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpRequest.BodyPublisher;
import java.net.http.HttpRequest.BodyPublishers;
import java.net.http.HttpResponse;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

// US12(#68) Acceptance: 회원가입 -> 로그인 -> 방문 예약 신청 -> 내 입장권(QR) 조회의 종단 시나리오.
//
// "Acceptance" 레벨(docs/테스트전략.md)이라 MockMvc가 아니라 실제 Gateway(8080)를 거쳐 Identity/
// Reservation/Expo가 전부 로컬에 떠 있어야 통과한다 - docker compose로 mysql/redis, 그리고 각 서비스를
// (IDE 등으로) 직접 띄운 상태에서만 의미가 있다. 그래서 일반 `test` 태스크에서는 제외하고
// (build.gradle의 excludeTags 'acceptance' 참고) 별도로 이렇게 돌린다:
//   ./gradlew :reservation:acceptanceTest --tests Us12SignupAndVisitApplicationAcceptanceTest
//
// 관리자 계정은 Identity의 로컬 기본 Seed(admin@admin.com/admin, application.yml 기본값)를 그대로 씀 -
// ADMIN_EMAIL/ADMIN_PASSWORD를 다른 값으로 바꿔 띄운 환경이면 이 테스트도 같이 바꿔야 함.
@Tag("acceptance")
@DisplayName("US12(#68) Acceptance - 회원가입~방문예약 무료 QR 발급")
class Us12SignupAndVisitApplicationAcceptanceTest {

    private static final String GATEWAY = "http://localhost:8080";
    private static final HttpClient HTTP = HttpClient.newHttpClient();
    private static final ObjectMapper OM = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    private static long openExpoId;   // 공개(OPEN) + 시작일이 미래인 박람회 - 정상 무료 신청 대상
    private static long draftExpoId;  // 비공개(DRAFT) 박람회 - 신청 실패 케이스용
    private static String runId;      // 이번 실행 회차 접미사 - 재실행해도 이메일이 안 겹치게

    @BeforeAll
    static void setUpFixtures() throws Exception {
        runId = UUID.randomUUID().toString().substring(0, 8);
        String adminToken = signIn("admin@admin.com", "admin");

        openExpoId = registerExpo(adminToken, "s2-us12-normal-expo-" + runId,
                LocalDateTime.now().plusDays(30), LocalDateTime.now().plusDays(33));
        openExpo(adminToken, openExpoId);

        draftExpoId = registerExpo(adminToken, "s2-us12-draft-expo-" + runId,
                LocalDateTime.now().plusDays(30), LocalDateTime.now().plusDays(33));
        // draftExpoId는 open() 호출 안 함 - DRAFT로 남겨서 "비공개 박람회 신청" 실패 케이스에 씀
    }

    @Test
    @DisplayName("정상: 가입 -> 로그인 -> 방문 예약 신청 -> 내 입장권 목록에 FREE 티켓 1건")
    void 정상_가입부터_QR_발급까지() throws Exception {
        String email = "s2-us12-normal-01-" + runId + "@test.local";
        signUp(email, "pw12345678", "홍길동", "010-1234-5678");

        String token = signIn(email, "pw12345678");
        LocalDate visitDate = LocalDate.now().plusDays(30);

        HttpResponse<String> applyRes = post("/api/customer/reservations", token,
                Map.of("expoId", openExpoId, "visitDates", List.of(visitDate)));
        assertThat(applyRes.statusCode()).isEqualTo(200);

        JsonNode tickets = OM.readTree(applyRes.body()).path("data").path("tickets");
        assertThat(tickets).hasSize(1);
        assertThat(tickets.get(0).path("expoId").asLong()).isEqualTo(openExpoId);
        assertThat(tickets.get(0).path("qrToken").asText()).isNotBlank();
        assertThat(tickets.get(0).path("qrImageBase64").asText()).isNotBlank();

        HttpResponse<String> myRes = get("/api/customer/reservations", token);
        assertThat(myRes.statusCode()).isEqualTo(200);
        JsonNode myTickets = OM.readTree(myRes.body()).path("data");
        boolean found = false;
        for (JsonNode t : myTickets) {
            if (t.path("expoId").asLong() == openExpoId
                    && t.path("visitDate").asText().equals(visitDate.toString())) {
                found = true;
                assertThat(t.path("ticketType").asText()).isEqualTo("FREE");
            }
        }
        assertThat(found).as("방금 신청한 티켓이 내 입장권 목록에 있어야 함").isTrue();
    }

    @Test
    @DisplayName("중복: 같은 이메일로 재가입하면 409")
    void 같은_이메일_재가입은_409() throws Exception {
        String email = "s2-us12-dup-01-" + runId + "@test.local";
        HttpResponse<String> first = signUpRaw(email, "pw12345678", "김철수", "010-2222-3333");
        assertThat(first.statusCode()).isEqualTo(201);

        HttpResponse<String> second = signUpRaw(email, "pw12345678", "김철수", "010-2222-3333");
        assertThat(second.statusCode()).isEqualTo(409);
    }

    @Test
    @DisplayName("날짜별 멱등: 같은 날짜로 2번 신청해도 티켓은 1건, QR도 동일")
    void 같은_날짜_재신청은_멱등() throws Exception {
        String email = "s2-us12-idem-01-" + runId + "@test.local";
        signUp(email, "pw12345678", "이영희", "010-3333-4444");
        String token = signIn(email, "pw12345678");
        LocalDate visitDate = LocalDate.now().plusDays(31);

        HttpResponse<String> first = post("/api/customer/reservations", token,
                Map.of("expoId", openExpoId, "visitDates", List.of(visitDate)));
        String firstQr = OM.readTree(first.body()).path("data").path("tickets").get(0).path("qrToken").asText();

        HttpResponse<String> second = post("/api/customer/reservations", token,
                Map.of("expoId", openExpoId, "visitDates", List.of(visitDate)));
        String secondQr = OM.readTree(second.body()).path("data").path("tickets").get(0).path("qrToken").asText();

        assertThat(secondQr).isEqualTo(firstQr);

        long countForDate = 0;
        JsonNode myTickets = OM.readTree(get("/api/customer/reservations", token).body()).path("data");
        for (JsonNode t : myTickets) {
            if (t.path("expoId").asLong() == openExpoId && t.path("visitDate").asText().equals(visitDate.toString())) {
                countForDate++;
            }
        }
        assertThat(countForDate).isEqualTo(1);
    }

    @Test
    @DisplayName("날짜가 다르면 신청할 때마다 별도 QR이 발급된다")
    void 다른_날짜는_별도_QR() throws Exception {
        String email = "s2-us12-multidate-01-" + runId + "@test.local";
        signUp(email, "pw12345678", "박민수", "010-4444-5555");
        String token = signIn(email, "pw12345678");

        HttpResponse<String> res = post("/api/customer/reservations", token,
                Map.of("expoId", openExpoId,
                        "visitDates", List.of(LocalDate.now().plusDays(30), LocalDate.now().plusDays(31))));
        JsonNode tickets = OM.readTree(res.body()).path("data").path("tickets");
        assertThat(tickets).hasSize(2);
        assertThat(tickets.get(0).path("qrToken").asText()).isNotEqualTo(tickets.get(1).path("qrToken").asText());
    }

    @Test
    @DisplayName("실패: 비공개(DRAFT) 박람회는 신청 409")
    void 비공개_박람회_신청은_409() throws Exception {
        String email = "s2-us12-draft-01-" + runId + "@test.local";
        signUp(email, "pw12345678", "정다은", "010-5555-6666");
        String token = signIn(email, "pw12345678");

        HttpResponse<String> res = post("/api/customer/reservations", token,
                Map.of("expoId", draftExpoId, "visitDates", List.of(LocalDate.now().plusDays(30))));
        assertThat(res.statusCode()).isEqualTo(409);
    }

    @Test
    @DisplayName("실패: 존재하지 않는 박람회는 신청 404")
    void 없는_박람회_신청은_404() throws Exception {
        String email = "s2-us12-notfound-01-" + runId + "@test.local";
        signUp(email, "pw12345678", "최지훈", "010-6666-7777");
        String token = signIn(email, "pw12345678");

        HttpResponse<String> res = post("/api/customer/reservations", token,
                Map.of("expoId", 999_999_999L, "visitDates", List.of(LocalDate.now().plusDays(30))));
        assertThat(res.statusCode()).isEqualTo(404);
    }

    @Test
    @DisplayName("실패: 인증 없이 신청하면 401")
    void 미인증_신청은_401() throws Exception {
        HttpResponse<String> res = postNoAuth("/api/customer/reservations",
                Map.of("expoId", openExpoId, "visitDates", List.of(LocalDate.now().plusDays(30))));
        assertThat(res.statusCode()).isEqualTo(401);
    }

    @Test
    @DisplayName("실패: EXHIBITOR 계정으로 신청하면 403")
    void 참가업체_계정_신청은_403() throws Exception {
        String businessNo = String.format("%03d%02d%05d",
                (int) (Math.random() * 900) + 100, (int) (Math.random() * 90) + 10, (int) (Math.random() * 90000) + 10000);
        String email = "s2-us12-exhibitor-01-" + runId + "@test.local";
        HttpResponse<String> signupRes = post("/api/auth/exhibitors/signup", null, Map.of(
                "businessNo", businessNo,
                "password", "pw12345678",
                "email", email,
                "companyName", "테스트모터스",
                "managerName", "담당자",
                "contact", "010-7777-8888",
                "companyAddress", "서울시 테스트구",
                "industry", "자동차",
                "representativeName", "대표자",
                "companyContact", "02-123-4567"));
        assertThat(signupRes.statusCode()).isEqualTo(201);

        String token = signIn(email, "pw12345678");
        HttpResponse<String> res = post("/api/customer/reservations", token,
                Map.of("expoId", openExpoId, "visitDates", List.of(LocalDate.now().plusDays(30))));
        assertThat(res.statusCode()).isEqualTo(403);
    }

    @Test
    @DisplayName("민감정보: 회원가입/로그인 응답에 비밀번호 원문이 노출되지 않는다")
    void 회원가입_로그인_응답에_비밀번호_없음() throws Exception {
        String email = "s2-us12-secret-01-" + runId + "@test.local";
        String rawPassword = "pw12345678";
        HttpResponse<String> signupRes = signUpRaw(email, rawPassword, "비밀정보", "010-8888-9999");
        assertThat(signupRes.body()).doesNotContain(rawPassword);

        HttpResponse<String> signInRes = signInRaw(email, rawPassword);
        assertThat(signInRes.body()).doesNotContain(rawPassword);
    }

    // ---------- helpers ----------

    private static void signUp(String email, String password, String name, String phone) throws Exception {
        HttpResponse<String> res = signUpRaw(email, password, name, phone);
        assertThat(res.statusCode()).as("signup body=%s", res.body()).isEqualTo(201);
    }

    private static HttpResponse<String> signUpRaw(String email, String password, String name, String phone) throws Exception {
        return post("/api/auth/signup", null,
                Map.of("email", email, "password", password, "name", name, "phone", phone));
    }

    private static String signIn(String email, String password) throws Exception {
        HttpResponse<String> res = signInRaw(email, password);
        assertThat(res.statusCode()).as("signin body=%s", res.body()).isEqualTo(200);
        return OM.readTree(res.body()).path("data").path("accessToken").asText();
    }

    private static HttpResponse<String> signInRaw(String email, String password) throws Exception {
        return post("/api/auth/signin", null, Map.of("email", email, "password", password));
    }

    private static long registerExpo(String adminToken, String title, LocalDateTime startsAt, LocalDateTime endsAt) throws Exception {
        HttpResponse<String> res = post("/api/admin/expos", adminToken, Map.of(
                "title", title,
                "venue", "테스트 전시장",
                "startsAt", startsAt,
                "endsAt", endsAt,
                "applyStartsAt", LocalDateTime.now().minusDays(1),
                "applyEndsAt", startsAt.minusDays(1),
                "admissionFee", 10_000,
                "booths", List.of(Map.of("boothNo", "T-" + UUID.randomUUID().toString().substring(0, 6),
                        "type", "STANDARD", "fee", 500_000))));
        assertThat(res.statusCode()).as("registerExpo body=%s", res.body()).isEqualTo(201);
        return OM.readTree(res.body()).path("data").path("expoId").asLong();
    }

    private static void openExpo(String adminToken, long expoId) throws Exception {
        HttpResponse<String> res = post("/api/admin/expos/" + expoId + "/open", adminToken, null);
        assertThat(res.statusCode()).isEqualTo(200);
    }

    private static HttpResponse<String> get(String path, String token) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(GATEWAY + path)).GET();
        if (token != null) {
            builder.header("Authorization", "Bearer " + token);
        }
        return HTTP.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }

    private static HttpResponse<String> post(String path, String token, Object body) throws Exception {
        BodyPublisher publisher = body == null ? BodyPublishers.noBody() : BodyPublishers.ofString(OM.writeValueAsString(body));
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(GATEWAY + path))
                .header("Content-Type", "application/json")
                .POST(publisher);
        if (token != null) {
            builder.header("Authorization", "Bearer " + token);
        }
        return HTTP.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }

    private static HttpResponse<String> postNoAuth(String path, Object body) throws Exception {
        return post(path, null, body);
    }
}
