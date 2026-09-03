package com.team4.payment.service;

import com.team4.payment.client.BookingClient;
import com.team4.payment.client.BookingInfoResponse;
import com.team4.payment.entity.Payment;
import com.team4.payment.entity.PaymentStatus;
import com.team4.payment.gateway.PaymentGateway;
import com.team4.payment.repository.PaymentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentFailureTest {

    @Mock private PaymentRepository paymentRepository;
    @Mock private BookingClient bookingClient;
    @Mock private PaymentGateway paymentGateway;

    @Test
    void 결제_실패시_FAILED_상태로_저장되고_PAID로_저장되지_않는다() {
        PaymentService paymentService = new PaymentService(paymentRepository, bookingClient, paymentGateway);

        when(bookingClient.getBooking("group-1")).thenReturn(Optional.of(
                new BookingInfoResponse("group-1", 1L, 100L, List.of(new BookingInfoResponse.BoothFeeInfo(10L, 300_000L)), true)
        ));
        when(paymentRepository.existsByBookingId("group-1")).thenReturn(false);
        when(paymentGateway.requestPayment(any(), any(), anyLong()))
                .thenReturn(PaymentGateway.PaymentGatewayResult.failure("잔액 부족"));
        when(paymentRepository.save(any(Payment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Payment result = paymentService.pay("group-1", 100L, 300_000L, "CARD", "test-payment-1");

        assertThat(result.getStatus()).isEqualTo(PaymentStatus.FAILED);
        assertThat(result.getStatus()).isNotEqualTo(PaymentStatus.PAID);
        assertThat(result.getCancelReason()).isEqualTo("잔액 부족");
    }
}