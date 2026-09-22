package com.team4.identity.reservation.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Component
@Primary
@Profile("reservation")
@Slf4j
public class ReservationHttpClient implements ReservationClient{

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

    // 실패 시 예외를 던져 탈퇴 자체를 막는다(fail-closed) - QR 무효화를 보장 못 한 채로
    // 탈퇴만 먼저 처리되면, 탈퇴 후에도 그 QR로 입장이 가능한 상태가 남을 수 있기 때문.
    @Override
    public void invalidateAllTickets(Long customerId) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(reservationBaseUrl + "/internal/reservation/customers/" + customerId + "/tickets/invalidate-all"))
                    .header("Authorization", "Bearer " + serviceToken)
                    .timeout(Duration.ofSeconds(5))
                    .POST(HttpRequest.BodyPublishers.noBody())
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.error("Reservation 티켓 무효화 실패 customerId={}, status={}, body={}",
                        customerId, response.statusCode(), response.body());
                throw new CustomException(ErrorCode.DEPENDENCY_TIMEOUT,
                        "입장권 정보를 확인할 수 없어 탈퇴를 진행할 수 없습니다. 잠시 후 다시 시도해 주세요.");
            }
        } catch (IOException | InterruptedException e) {
            log.error("Reservation 서버 통신 중 오류 customerId={}: {}", customerId, e.getMessage());
            throw new CustomException(ErrorCode.DEPENDENCY_TIMEOUT,
                    "입장권 정보를 확인할 수 없어 탈퇴를 진행할 수 없습니다. 잠시 후 다시 시도해 주세요.");
        }
    }

    // 관리자 회원(참관객) 목록/엑셀 화면 전용 - fail-open. 여기서 실패한다고 화면 자체를 막을 이유가 없어서,
    // 예외를 던지는 대신 로그만 남기고 빈 목록을 돌려준다(AdminUserService가 전부 "미체크인"으로 표시).
    @Override
    public List<CustomerCheckInStatus> getCheckInStatuses(List<Long> customerIds) {
        if (customerIds == null || customerIds.isEmpty()) {
            return List.of();
        }
        try {
            String body = objectMapper.writeValueAsString(customerIds);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(reservationBaseUrl + "/internal/reservation/customers/check-in-status"))
                    .header("Authorization", "Bearer " + serviceToken)
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(5))
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.warn("Reservation 체크인 상태 조회 실패 status={}, body={}", response.statusCode(), response.body());
                return List.of();
            }

            JsonNode data = objectMapper.readTree(response.body()).path("data");
            List<CustomerCheckInStatus> result = new ArrayList<>();
            data.forEach(node -> result.add(new CustomerCheckInStatus(
                    node.path("customerId").asLong(),
                    node.path("checkedIn").asBoolean(false),
                    node.hasNonNull("lastCheckedInAt") ? LocalDateTime.parse(node.path("lastCheckedInAt").asText()) : null)));
            return result;
        } catch (Exception e) {
            log.warn("Reservation 체크인 상태 조회 중 오류: {}", e.getMessage());
            return List.of();
        }
    }
}