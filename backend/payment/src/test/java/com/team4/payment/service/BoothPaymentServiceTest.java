package com.team4.payment.service;

import com.team4.common.error.CustomException;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class BoothPaymentServiceTest {

    @Mock
    private PaymentRepository paymentRepository;
    @Mock
    private BookingClient bookingClient;
    @Mock
    private PaymentGateway paymentGateway;

    @Test
    void 승인된_묶음신청은_부스합계금액으로_정상_결제된다() {
        PaymentService paymentService = new PaymentService(paymentRepository, bookingClient, paymentGateway);

        BookingInfoResponse booking = new BookingInfoResponse(1L, 1L, List.of(
                new BookingInfoResponse.BoothFeeInfo(10L, 300_000L),
                new BookingInfoResponse.BoothFeeInfo(11L, 200_000L)
        ), true);

        when(bookingClient.getBooking(1L)).thenReturn(Optional.of(booking));
        when(paymentRepository.existsByBookingId(1L)).thenReturn(false);
        when(paymentGateway.requestPayment(any(), anyLong(), anyLong()))
                .thenReturn(PaymentGateway.PaymentGatewayResult.succeeded());
        when(paymentRepository.save(any(Payment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Payment result = paymentService.pay(1L, 100L, 500_000L, "CARD");

        assertThat(result.getStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(result.getAmount()).isEqualTo(500_000L);
        assertThat(result.getItems()).hasSize(2);
    }

    @Test
    void 미승인_신청은_결제가_거부된다() {
        PaymentService paymentService = new PaymentService(paymentRepository, bookingClient, paymentGateway);

        when(bookingClient.getBooking(2L)).thenReturn(Optional.of(
                new BookingInfoResponse(2L, 1L, List.of(new BookingInfoResponse.BoothFeeInfo(12L, 300_000L)), false)
        ));

        assertThatThrownBy(() -> paymentService.pay(2L, 100L, 300_000L, "CARD"))
                .isInstanceOf(CustomException.class);
    }

    @Test
    void 결제_금액이_부스_합계와_다르면_거부된다() {
        PaymentService paymentService = new PaymentService(paymentRepository, bookingClient, paymentGateway);

        when(bookingClient.getBooking(3L)).thenReturn(Optional.of(
                new BookingInfoResponse(3L, 1L, List.of(new BookingInfoResponse.BoothFeeInfo(13L, 500_000L)), true)
        ));
        when(paymentRepository.existsByBookingId(3L)).thenReturn(false);

        assertThatThrownBy(() -> paymentService.pay(3L, 100L, 300_000L, "CARD"))
                .isInstanceOf(CustomException.class);
    }
}
