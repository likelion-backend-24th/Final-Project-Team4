package com.team4.payment.client;

import java.util.Optional;

public interface BookingClient {
    Optional<BookingInfoResponse> getBooking(Long bookingId);
}
