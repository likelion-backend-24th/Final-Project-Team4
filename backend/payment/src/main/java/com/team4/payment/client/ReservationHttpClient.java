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
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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
    public AdmissionContext getAdmissionContext(Long customerId, Long expoId, List<LocalDate> visitDates) {
        try {
            String query = visitDates.stream()
                    .map(d -> "visitDates=" + URLEncoder.encode(d.toString(), StandardCharsets.UTF_8))
                    .collect(Collectors.joining("&"));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(reservationBaseUrl + "/internal/reservation/customers/" + customerId
                            + "/expos/" + expoId + "/admission-context?" + query))
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

            List<LocalDate> blockedDates = new ArrayList<>();
            data.path("blockedDates").forEach(node -> blockedDates.add(LocalDate.parse(node.asText())));

            return new AdmissionContext(
                    data.path("expoId").asLong(),
                    data.path("customerId").asLong(),
                    blockedDates,
                    data.path("admissionFee").asLong()
            );

        } catch (IOException | InterruptedException e) {
            throw new CustomException(ErrorCode.DEPENDENCY_TIMEOUT, "Reservation 서버 통신 중 오류: " + e.getMessage());
        }
    }

    @Override
    public List<AdmissionTicket> issueAdmissionTicket(Long customerId, Long expoId, List<LocalDate> visitDates) {
        try {
            String body = objectMapper.writeValueAsString(
                    Map.of("visitDates", visitDates.stream().map(LocalDate::toString).toList()));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(reservationBaseUrl + "/internal/reservation/customers/" + customerId
                            + "/expos/" + expoId + "/admission-tickets"))
                    .header("Authorization", "Bearer " + serviceToken)
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(5))
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                throw new CustomException(ErrorCode.DEPENDENCY_TIMEOUT,
                        "Reservation 티켓 발급 실패 (status=" + response.statusCode() + "): " + response.body());
            }

            JsonNode data = objectMapper.readTree(response.body()).path("data");
            List<AdmissionTicket> tickets = new ArrayList<>();
            data.path("tickets").forEach(t -> tickets.add(new AdmissionTicket(
                    t.path("ticketId").asLong(),
                    LocalDate.parse(t.path("visitDate").asText()),
                    t.path("qrToken").asText(),
                    t.path("qrImageBase64").asText(null)
            )));
            return tickets;

        } catch (IOException | InterruptedException e) {
            throw new CustomException(ErrorCode.DEPENDENCY_TIMEOUT, "Reservation 서버 통신 중 오류: " + e.getMessage());
        }
    }
}
