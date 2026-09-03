package com.team4.payment.client;

import java.time.LocalDateTime;
import java.util.Optional;

public interface BookingClient {
    Optional<BookingInfoResponse> getBooking(String bookingId);

    // 결제 성공 후 Expo에 확정 통보
    void confirm(String bookingId, String paymentId, LocalDateTime paidAt);

    // 결제 실패/시간초과 시 Expo에 반려 통보
    void release(String bookingId, String reason);
}