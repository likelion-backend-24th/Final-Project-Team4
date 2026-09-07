package com.team4.reservation.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;

// payment 모듈의 ExpoBookingClient와 같은 패턴(java.net.http.HttpClient 직접 사용, SVC_TOKEN Bearer 인증).
@Component
public class ExpoQueryClient implements ExpoClient {

    private final String expoBaseUrl;
    private final String serviceToken;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public ExpoQueryClient(
            @Value("${expo.base-url}") String expoBaseUrl,
            @Value("${expo.service-token}") String serviceToken,
            ObjectMapper objectMapper
    ) {
        this.expoBaseUrl = expoBaseUrl;
        this.serviceToken = serviceToken;
        this.objectMapper = objectMapper;
    }

    @Override
    public Optional<ExpoInfo> getExpo(Long expoId) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(expoBaseUrl + "/internal/expo/expos/" + expoId))
                    .header("Authorization", "Bearer " + serviceToken)
                    .timeout(Duration.ofSeconds(5))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 404) {
                return Optional.empty();
            }
            if (response.statusCode() != 200) {
                throw new CustomException(ErrorCode.DEPENDENCY_TIMEOUT,
                        "Expo 서버 조회 실패 (status=" + response.statusCode() + "): " + response.body());
            }

            JsonNode data = objectMapper.readTree(response.body()).path("data");

            return Optional.of(new ExpoInfo(
                    data.path("expoId").asLong(),
                    data.path("status").asText(),
                    LocalDateTime.parse(data.path("startsAt").asText()),
                    LocalDateTime.parse(data.path("endsAt").asText()),
                    data.path("admissionFee").asLong()
            ));
        } catch (IOException | InterruptedException e) {
            throw new CustomException(ErrorCode.DEPENDENCY_TIMEOUT, "Expo 서버 통신 중 오류: " + e.getMessage());
        }
    }
}
