package com.team4.payment.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Component
@Primary
public class ExpoBookingClient implements BookingClient {

    private final String expoBaseUrl;
    private final String serviceToken;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public ExpoBookingClient(
            @Value("${expo.base-url}") String expoBaseUrl,
            @Value("${expo.service-token}") String serviceToken,
            ObjectMapper objectMapper
    ) {
        this.expoBaseUrl = expoBaseUrl;
        this.serviceToken = serviceToken;
        this.objectMapper = objectMapper;
    }

    @Override
    public Optional<BookingInfoResponse> getBooking(String bookingId) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(expoBaseUrl + "/internal/expo/booth-application-groups/" + bookingId + "/payment-context"))
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

            Long expoId = data.path("expoId").asLong();
            boolean reviewComplete = data.path("reviewComplete").asBoolean();
            Long applicantId = data.path("applicantId").asLong();

            List<BookingInfoResponse.BoothFeeInfo> items = new ArrayList<>();
            for (JsonNode item : data.path("items")) {
                items.add(new BookingInfoResponse.BoothFeeInfo(
                        item.path("boothId").asLong(),
                        item.path("amount").asLong()
                ));
            }

            boolean payable = reviewComplete && !items.isEmpty();

            return Optional.of(new BookingInfoResponse(bookingId, expoId, applicantId, items, payable));

        } catch (IOException | InterruptedException e) {
            throw new CustomException(ErrorCode.DEPENDENCY_TIMEOUT, "Expo 서버 통신 중 오류: " + e.getMessage());
        }
    }

    @Override
    public void confirm(String bookingId, String paymentId, LocalDateTime paidAt) {
        try {
            String json = objectMapper.writeValueAsString(new ConfirmBody(paymentId, paidAt));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(expoBaseUrl + "/internal/expo/booth-application-groups/" + bookingId + "/confirm"))
                    .header("Authorization", "Bearer " + serviceToken)
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(5))
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                throw new CustomException(ErrorCode.DEPENDENCY_TIMEOUT,
                        "Expo 확정 통보 실패 (status=" + response.statusCode() + "): " + response.body());
            }
        } catch (IOException | InterruptedException e) {
            throw new CustomException(ErrorCode.DEPENDENCY_TIMEOUT, "Expo 확정 통보 중 오류: " + e.getMessage());
        }
    }

    @Override
    public void release(String bookingId, String reason) {
        try {
            String json = objectMapper.writeValueAsString(new ReleaseBody(reason));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(expoBaseUrl + "/internal/expo/booth-application-groups/" + bookingId + "/release"))
                    .header("Authorization", "Bearer " + serviceToken)
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(5))
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                throw new CustomException(ErrorCode.DEPENDENCY_TIMEOUT,
                        "Expo 해제 통보 실패 (status=" + response.statusCode() + "): " + response.body());
            }
        } catch (IOException | InterruptedException e) {
            throw new CustomException(ErrorCode.DEPENDENCY_TIMEOUT, "Expo 해제 통보 중 오류: " + e.getMessage());
        }
    }

    private record ConfirmBody(String paymentId, LocalDateTime paidAt) {}
    private record ReleaseBody(String reason) {}
}