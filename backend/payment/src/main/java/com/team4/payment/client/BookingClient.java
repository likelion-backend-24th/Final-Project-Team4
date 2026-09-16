package com.team4.payment.client;

import java.time.LocalDateTime;
import java.util.Optional;

public interface BookingClient {
    Optional<BookingInfoResponse> getBooking(String bookingId);

    // 결제 성공 후 Expo에 확정 통보
    void confirm(String bookingId, String paymentId, LocalDateTime paidAt);

    // 결제 실패/시간초과 시 Expo에 반려 통보
    void release(String bookingId, String reason);

    // 환불 완료 후 Expo에 취소 통보(참가 확정 취소, 부스 자리 반납)
    void cancel(String bookingId, String reason);
}