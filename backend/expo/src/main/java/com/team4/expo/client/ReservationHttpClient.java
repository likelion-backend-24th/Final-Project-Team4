package com.team4.expo.client;

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
import java.time.LocalDate;

// reservation 모듈의 ExpoQueryClient와 같은 패턴(java.net.http.HttpClient 직접 사용, SVC_TOKEN Bearer 인증).
// 실패 시 fail-closed로 CustomException(DEPENDENCY_TIMEOUT)을 던져 상담 신청을 열지 않는다.
@Component
public class ReservationHttpClient implements ReservationClient {

    private final String reservationBaseUrl;
    private final String serviceToken;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public ReservationHttpClient(
            @Value("${reservation.base-url}") String reservationBaseUrl,
            @Value("${reservation.service-token}") String serviceToken,
            ObjectMapper objectMapper
    ) {
        this.reservationBaseUrl = reservationBaseUrl;
        this.serviceToken = serviceToken;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean hasTicket(Long customerId, Long expoId, LocalDate visitDate) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(reservationBaseUrl + "/internal/reservation/customers/" + customerId
                            + "/expos/" + expoId + "/tickets/" + visitDate))
                    .header("Authorization", "Bearer " + serviceToken)
                    .timeout(Duration.ofSeconds(5))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                throw new CustomException(ErrorCode.DEPENDENCY_TIMEOUT,
                        "Reservation 서버 조회 실패 (status=" + response.statusCode() + "): " + response.body());
            }

            JsonNode data = objectMapper.readTree(response.body()).path("data");
            return data.path("hasTicket").asBoolean(false);
        } catch (IOException | InterruptedException e) {
            throw new CustomException(ErrorCode.DEPENDENCY_TIMEOUT, "Reservation 서버 통신 중 오류: " + e.getMessage());
        }
    }
}
