package com.team4.payment.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
@Slf4j
public class StubBookingClient implements BookingClient {
    private final Map<String, BookingInfoResponse> fakeData = Map.of(
            "stub-group-1", new BookingInfoResponse("stub-group-1", 1L, 100L, List.of(
                    new BookingInfoResponse.BoothFeeInfo(10L, 300_000L),
                    new BookingInfoResponse.BoothFeeInfo(11L, 200_000L)
            ), true),

            "stub-group-2", new BookingInfoResponse("stub-group-2", 1L, 100L, List.of(
                    new BookingInfoResponse.BoothFeeInfo(12L, 300_000L)
            ), false),

            "stub-group-3", new BookingInfoResponse("stub-group-3", 1L, 100L, List.of(
                    new BookingInfoResponse.BoothFeeInfo(13L, 500_000L)
            ), true)
    );

    @Override
    public Optional<BookingInfoResponse> getBooking(String bookingId) {
        return Optional.ofNullable(fakeData.get(bookingId));
    }

    @Override
    public void confirm(String bookingId, String paymentId, LocalDateTime paidAt) {
        log.info("[STUB] 예약 확정 처리 (실제로는 아무 일도 안 일어남) bookingId={}, paymentId={}", bookingId, paymentId);
    }

    @Override
    public void release(String bookingId, String reason) {
        log.info("[STUB] 예약 해제 처리 (실제로는 아무 일도 안 일어남) bookingId={}, reason={}", bookingId, reason);
    }
}