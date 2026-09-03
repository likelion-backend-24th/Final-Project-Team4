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

        BookingInfoResponse booking = new BookingInfoResponse("group-1", 1L, 100L, List.of(
                new BookingInfoResponse.BoothFeeInfo(10L, 300_000L),
                new BookingInfoResponse.BoothFeeInfo(11L, 200_000L)
        ), true);

        when(bookingClient.getBooking("group-1")).thenReturn(Optional.of(booking));
        when(paymentRepository.existsByBookingId("group-1")).thenReturn(false);
        when(paymentGateway.requestPayment(any(), any(), anyLong()))
                .thenReturn(PaymentGateway.PaymentGatewayResult.succeeded());
        when(paymentRepository.save(any(Payment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Payment result = paymentService.pay("group-1", 100L, 500_000L, "CARD", "test-payment-1");

        assertThat(result.getStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(result.getAmount()).isEqualTo(500_000L);
        assertThat(result.getItems()).hasSize(2);
    }

    @Test
    void 미승인_신청은_결제가_거부된다() {
        PaymentService paymentService = new PaymentService(paymentRepository, bookingClient, paymentGateway);

        when(bookingClient.getBooking("group-2")).thenReturn(Optional.of(
                new BookingInfoResponse("group-2", 1L, 100L, List.of(new BookingInfoResponse.BoothFeeInfo(12L, 300_000L)), false)
        ));

        assertThatThrownBy(() -> paymentService.pay("group-2", 100L, 300_000L, "CARD", "test-payment-2"))
                .isInstanceOf(CustomException.class);
    }

    @Test
    void 결제_금액이_부스_합계와_다르면_거부된다() {
        PaymentService paymentService = new PaymentService(paymentRepository, bookingClient, paymentGateway);

        when(bookingClient.getBooking("group-3")).thenReturn(Optional.of(
                new BookingInfoResponse("group-3", 1L, 100L, List.of(new BookingInfoResponse.BoothFeeInfo(13L, 500_000L)), true)
        ));
        when(paymentRepository.existsByBookingId("group-3")).thenReturn(false);

        assertThatThrownBy(() -> paymentService.pay("group-3", 100L, 300_000L, "CARD", "test-payment-3"))
                .isInstanceOf(CustomException.class);
    }

    @Test
    void 본인_신청이_아니면_거부된다() {
        PaymentService paymentService = new PaymentService(paymentRepository, bookingClient, paymentGateway);

        // 신청자(applicantId)는 100L인데, 결제 요청은 다른 사람(999L)이 보냄
        when(bookingClient.getBooking("group-4")).thenReturn(Optional.of(
                new BookingInfoResponse("group-4", 1L, 100L, List.of(new BookingInfoResponse.BoothFeeInfo(14L, 300_000L)), true)
        ));

        assertThatThrownBy(() -> paymentService.pay("group-4", 999L, 300_000L, "CARD", "test-payment-4"))
                .isInstanceOf(CustomException.class);
    }
}
