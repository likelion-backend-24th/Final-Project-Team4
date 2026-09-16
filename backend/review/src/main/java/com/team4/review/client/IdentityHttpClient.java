package com.team4.review.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

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
    public Optional<String> getCustomerName(Long customerId) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(identityBaseUrl + "/internal/identity/users/" + customerId))
                    .header("Authorization", "Bearer " + serviceToken)
                    .timeout(Duration.ofSeconds(5))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.warn("Identity 고객 정보 조회 실패 customerId={}, status={}", customerId, response.statusCode());
                return Optional.empty();
            }

            JsonNode data = objectMapper.readTree(response.body()).path("data");
            return Optional.ofNullable(data.path("name").asText(null));
        } catch (IOException | InterruptedException e) {
            log.warn("Identity 서버 통신 중 오류 customerId={}: {}", customerId, e.getMessage());
            return Optional.empty();
        }
    }
}
