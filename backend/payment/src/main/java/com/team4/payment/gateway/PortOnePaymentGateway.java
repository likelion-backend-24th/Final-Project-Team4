package com.team4.payment.gateway;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Component
@Primary
public class PortOnePaymentGateway implements PaymentGateway {

    private final String apiSecret;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public PortOnePaymentGateway(
            @Value("${portone.api-secret}") String apiSecret,
            ObjectMapper objectMapper
    ) {
        this.apiSecret = apiSecret;
        this.objectMapper = objectMapper;
    }

    @Override
    public PaymentGatewayResult requestPayment(String paymentId, String bookingId, Long amount) {
        try {
            String encodedId = URLEncoder.encode(paymentId, StandardCharsets.UTF_8);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.portone.io/payments/" + encodedId))
                    .header("Authorization", "PortOne " + apiSecret)
                    .timeout(Duration.ofSeconds(5))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                return PaymentGatewayResult.failure(
                        "포트원 결제 조회 실패 (status=" + response.statusCode() + "): " + response.body());
            }

            JsonNode body = objectMapper.readTree(response.body());
            String status = body.path("status").asText();

            if (!"PAID".equals(status)) {
                return PaymentGatewayResult.failure("결제가 완료된 상태가 아닙니다. (status=" + status + ")");
            }

            long paidAmount = body.path("amount").path("total").asLong();
            if (paidAmount != amount) {
                return PaymentGatewayResult.failure(
                        "결제 금액이 일치하지 않습니다. 요청: " + amount + "원, 실제 결제: " + paidAmount + "원");
            }

            return PaymentGatewayResult.succeeded();

        } catch (Exception e) {
            return PaymentGatewayResult.failure("포트원 결제 검증 중 오류 발생: " + e.getMessage());
        }
    }
}