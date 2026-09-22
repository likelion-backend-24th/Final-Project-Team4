package com.team4.reservation.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class IdentityQueryClient implements IdentityClient {

    private final String identityBaseUrl;
    private final String serviceToken;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public IdentityQueryClient(@Value("${identity.base-url}") String identityBaseUrl,
                               @Value("${identity.service-token}") String serviceToken,
                               ObjectMapper objectMapper) {
        this.identityBaseUrl = identityBaseUrl;
        this.serviceToken = serviceToken;
        this.objectMapper = objectMapper;
    }

    @Override
    public Map<Long, String> getUserNames(List<Long> userIds) {
        if (userIds.isEmpty()) {
            return Map.of();
        }

        String ids = userIds.stream().map(String::valueOf).collect(Collectors.joining(","));

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(identityBaseUrl + "/internal/identity/users/names?ids=" + ids))
                    .header("Authorization", "Bearer " + serviceToken)
                    .timeout(Duration.ofSeconds(5))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.warn("Identity 고객 이름 조회 실패 status={}", response.statusCode());
                return Map.of();
            }

            // data는 { "3": "홍길동", ... } 형태. 탈퇴 등으로 없는 id는 제외
            JsonNode data = objectMapper.readTree(response.body()).path("data");
            Map<Long, String> names = new HashMap<>();
            data.fields().forEachRemaining(e -> names.put(Long.valueOf(e.getKey()), e.getValue().asText()));

            return names;
        } catch (IOException | InterruptedException e) {
            log.warn("Identity 서버 통신 중 오류: {}", e.getMessage());
            return Map.of();
        }
    }
}
