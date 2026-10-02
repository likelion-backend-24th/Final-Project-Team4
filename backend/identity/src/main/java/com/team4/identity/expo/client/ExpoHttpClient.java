package com.team4.identity.expo.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Component
@Primary
@Profile("expo")
@Slf4j
public class ExpoHttpClient implements ExpoClient {

    private final String expoBaseUrl;
    private final String serviceToken;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public ExpoHttpClient(
            @Value("${expo.base-url}") String expoBaseUrl,
            @Value("${expo.service-token}") String serviceToken,
            ObjectMapper objectMapper
    ) {
        this.expoBaseUrl = expoBaseUrl;
        this.serviceToken = serviceToken;
        this.objectMapper = objectMapper;
    }

    // 탈퇴 시 상담,리드의 개인정보 익명 처리 실패 방지
    @Override
    public void anonymizeCustomer(Long customerId) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(expoBaseUrl + "/internal/expo/customers/" + customerId + "/anonymize"))
                    .header("Authorization", "Bearer " + serviceToken)
                    .timeout(Duration.ofSeconds(5))
                    .POST(HttpRequest.BodyPublishers.noBody())
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.error("Expo 개인정보 익명화 실패 customerId={}, status={}, body={}",
                        customerId, response.statusCode(), response.body());
                throw new CustomException(ErrorCode.DEPENDENCY_TIMEOUT,
                        "상담 정보를 정리할 수 없어 탈퇴를 진행할 수 없습니다. 잠시 후 다시 시도해 주세요.");
            }
        } catch (IOException | InterruptedException e) {
            log.error("Expo 서버 통신 중 오류 customerId={}: {}", customerId, e.getMessage());
            throw new CustomException(ErrorCode.DEPENDENCY_TIMEOUT,
                    "상담 정보를 정리할 수 없어 탈퇴를 진행할 수 없습니다. 잠시 후 다시 시도해 주세요.");
        }
    }

    // 관리자 회원(참가업체) 목록/엑셀/통계 화면 전용 - fail-open. 여기서 실패한다고 화면 자체를 막을 이유가 없어서,
    // 예외를 던지는 대신 로그만 남기고 빈 목록을 돌려준다(AdminUserService가 전부 "신청 0건/미참가"로 표시).
    @Override
    public List<ExhibitorApplicationStats> getApplicationStats(List<Long> exhibitorIds) {
        if (exhibitorIds == null || exhibitorIds.isEmpty()) {
            return List.of();
        }
        try {
            String body = objectMapper.writeValueAsString(exhibitorIds);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(expoBaseUrl + "/internal/expo/exhibitors/application-stats"))
                    .header("Authorization", "Bearer " + serviceToken)
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(5))
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.warn("Expo 참가 신청 통계 조회 실패 status={}, body={}", response.statusCode(), response.body());
                return List.of();
            }

            JsonNode data = objectMapper.readTree(response.body()).path("data");
            List<ExhibitorApplicationStats> result = new ArrayList<>();
            data.forEach(node -> result.add(new ExhibitorApplicationStats(
                    node.path("exhibitorId").asLong(),
                    node.path("applicationCount").asLong(0),
                    node.path("participating").asBoolean(false))));
            return result;
        } catch (Exception e) {
            log.warn("Expo 참가 신청 통계 조회 중 오류: {}", e.getMessage());
            return List.of();
        }
    }
}