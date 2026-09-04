package com.team4.expo.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Optional;

@Component
@Slf4j
public class PaymentServiceClient implements PaymentClient {
    private final String paymentBaseUrl;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .build();

    public PaymentServiceClient(
            @Value("${payment.base-url}") String paymentBaseUrl,
            ObjectMapper objectMapper
    ) {
        this.paymentBaseUrl = paymentBaseUrl;
        this.objectMapper = objectMapper;
    }

    @Override
    public Optional<String> getPaymentStatus(String groupId){
        try{
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(paymentBaseUrl + "/api/exhibitor/payments/" + groupId + "/status"))
                    .timeout(Duration.ofSeconds(3))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 404) {
                return Optional.empty(); // 아직 결제 이력 없음
            }
            if (response.statusCode() != 200) {
                log.warn("Payment 서비스 결제 상태 조회 실패 (status={}): {}", response.statusCode(), response.body());
                return Optional.empty();
            }

            JsonNode body = objectMapper.readTree(response.body());
            return Optional.ofNullable(body.path("status").asText(null));

        } catch (Exception e) {
            // Payment 서비스가 잠깐 안 떠 있어도 신청 내역 조회 자체는 막지 않음 (best-effort)
            log.warn("Payment 서비스 통신 중 오류, 결제 상태는 알 수 없음으로 처리: {}", e.getMessage());
            return Optional.empty();
        }
    }
}