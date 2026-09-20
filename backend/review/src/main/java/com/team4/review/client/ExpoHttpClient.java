package com.team4.review.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

// expo 모듈의 ReservationHttpClient/IdentityHttpClient와 같은 패턴(java.net.http.HttpClient 직접 사용, SVC_TOKEN Bearer 인증).
@Component
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

    @Override
    public BoothReviewEligibility checkReviewEligibility(Long boothId, Long customerId, String reviewType, Long consultationId) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(expoBaseUrl + "/internal/expo/booths/" + boothId
                            + "/review-eligibility?customerId=" + customerId + "&reviewType=" + reviewType
                            + (consultationId == null ? "" : "&consultationId=" + consultationId)))
                    .header("Authorization", "Bearer " + serviceToken)
                    .timeout(Duration.ofSeconds(5))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 404) {
                throw new CustomException(ErrorCode.NOT_FOUND, "부스를 찾을 수 없습니다.");
            }
            if (response.statusCode() != 200) {
                throw new CustomException(ErrorCode.DEPENDENCY_TIMEOUT,
                        "Expo 서버 조회 실패 (status=" + response.statusCode() + "): " + response.body());
            }

            JsonNode data = objectMapper.readTree(response.body()).path("data");
            return new BoothReviewEligibility(data.path("eligible").asBoolean(false), data.path("boothNo").asText(null),
                    data.path("companyName").asText(null), data.path("expoTitle").asText(null));
        } catch (IOException | InterruptedException e) {
            throw new CustomException(ErrorCode.DEPENDENCY_TIMEOUT, "Expo 서버 통신 중 오류: " + e.getMessage());
        }
    }

    @Override
    public boolean isBoothOwnedByExhibitor(Long boothId, Long exhibitorId) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(expoBaseUrl + "/internal/expo/booths/" + boothId
                            + "/owned-by?exhibitorId=" + exhibitorId))
                    .header("Authorization", "Bearer " + serviceToken)
                    .timeout(Duration.ofSeconds(5))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new CustomException(ErrorCode.DEPENDENCY_TIMEOUT,
                        "Expo 서버 조회 실패 (status=" + response.statusCode() + "): " + response.body());
            }

            JsonNode data = objectMapper.readTree(response.body()).path("data");
            return data.path("owned").asBoolean(false);
        } catch (IOException | InterruptedException e) {
            throw new CustomException(ErrorCode.DEPENDENCY_TIMEOUT, "Expo 서버 통신 중 오류: " + e.getMessage());
        }
    }
}
