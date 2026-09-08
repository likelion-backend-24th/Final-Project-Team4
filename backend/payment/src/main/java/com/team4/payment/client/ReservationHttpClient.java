package com.team4.payment.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
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

// 실제 Reservation 서비스(/internal/reservation/...) 호출용 클라이언트.
@Component
@Primary
@Profile("reservation")
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
    public AdmissionContext getAdmissionContext(Long customerId, Long expoId) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(reservationBaseUrl + "/internal/reservation/customers/" + customerId
                            + "/expos/" + expoId + "/admission-context"))
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

            return new AdmissionContext(
                    data.path("expoId").asLong(),
                    data.path("customerId").asLong(),
                    data.path("hasFreeAdmission").asBoolean(),
                    data.path("admissionFee").asLong()
            );

        } catch (IOException | InterruptedException e) {
            throw new CustomException(ErrorCode.DEPENDENCY_TIMEOUT, "Reservation 서버 통신 중 오류: " + e.getMessage());
        }
    }
}