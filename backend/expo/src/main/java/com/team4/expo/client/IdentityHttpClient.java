package com.team4.expo.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Optional;

@Component
@Slf4j
public class IdentityHttpClient implements IdentityClient {

    private final String identityBaseUrl;
    private final String serviceToken;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public IdentityHttpClient(
            @Value("${identity.base-url}") String identityBaseUrl,
            @Value("${identity.service-token}") String serviceToken,
            ObjectMapper objectMapper
    ) {
        this.identityBaseUrl = identityBaseUrl;
        this.serviceToken = serviceToken;
        this.objectMapper = objectMapper;
    }

    @Override
    public Optional<ExhibitorProfile> getExhibitorProfile(Long userId) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(identityBaseUrl + "/internal/identity/users/" + userId))
                    .header("Authorization", "Bearer " + serviceToken)
                    .timeout(Duration.ofSeconds(5))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.warn("Identity 참가업체 정보 조회 실패 userId={}, status={}", userId, response.statusCode());
                return Optional.empty();
            }

            JsonNode data = objectMapper.readTree(response.body()).path("data");

            return Optional.of(new ExhibitorProfile(
                    data.path("companyName").asText(null),
                    data.path("industry").asText(null),
                    data.path("businessNo").asText(null),
                    data.path("representativeName").asText(null),
                    data.path("email").asText(null)
            ));
        } catch (IOException | InterruptedException e) {
            // 부가 표시 정보 조회 실패는 부스 목록 조회 자체를 막으면 안 되므로 예외를 삼키고 빈 값 반환
            log.warn("Identity 서버 통신 중 오류 userId={}: {}", userId, e.getMessage());
            return Optional.empty();
        }
    }
}
