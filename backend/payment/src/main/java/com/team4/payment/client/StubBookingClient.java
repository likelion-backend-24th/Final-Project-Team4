package com.team4.payment.client;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public class StubBookingClient implements BookingClient {
    private final Map<Long, BookingInfoResponse> fakeData = Map.of(
            // 부스 2개 묶어서 신청 -> 승인됨, 합계 500,000원
            1L, new BookingInfoResponse(1L, 1L, List.of(
                    new BookingInfoResponse.BoothFeeInfo(10L, 300_000L),
                    new BookingInfoResponse.BoothFeeInfo(11L, 200_000L)
            ), true),

            // 아직 승인 안 됨 -> 결제 불가
            2L, new BookingInfoResponse(2L, 1L, List.of(
                    new BookingInfoResponse.BoothFeeInfo(12L, 300_000L)
            ), false),

            // 승인됨, 요청 금액과 다르게 검증할 용도
            3L, new BookingInfoResponse(3L, 1L, List.of(
                    new BookingInfoResponse.BoothFeeInfo(13L, 500_000L)
            ), true)
    );

    @Override
    public Optional<BookingInfoResponse> getBooking(Long bookingId) {
        return Optional.ofNullable(fakeData.get(bookingId));
    }
}
