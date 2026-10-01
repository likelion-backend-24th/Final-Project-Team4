package com.team4.payment.service;

import com.team4.common.error.CustomException;
import com.team4.payment.client.BookingClient;
import com.team4.payment.client.BookingInfoResponse;
import com.team4.payment.gateway.PaymentGateway;
import com.team4.payment.repository.PaymentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DuplicatePaymentTest {

    @Mock private PaymentRepository paymentRepository;
    @Mock private BookingClient bookingClient;
    @Mock private PaymentGateway paymentGateway;

    @Test
    void 이미_결제완료된_신청에_새로_결제하면_차단되고_그_결제는_자동_취소된다() {
        PaymentService paymentService = new PaymentService(paymentRepository, bookingClient, paymentGateway);

        when(bookingClient.getBooking("group-1")).thenReturn(Optional.of(
                new BookingInfoResponse("group-1", 1L, 100L, List.of(new BookingInfoResponse.BoothFeeInfo(10L, 300_000L)), true)
        ));
        // 이미 결제된 상태로 가정, 새로 들어온 결제(test-payment-2)는 PortOne에서 실제로 결제 완료된 상태
        when(paymentRepository.existsByBookingId("group-1")).thenReturn(true);
        when(paymentGateway.requestPayment(any(), any(), anyLong())).thenReturn(PaymentGateway.PaymentGatewayResult.succeeded());
        when(paymentGateway.cancelPayment(any(), any(), any())).thenReturn(PaymentGateway.RefundResult.succeeded());

        assertThatThrownBy(() -> paymentService.pay("group-1", 100L, 300_000L, "CARD", "test-payment-2"))
                .isInstanceOf(CustomException.class);

        // 저장은 안 되고, 돈만 빠지지 않도록 새 결제는 취소
        verify(paymentRepository, never()).save(any());
        verify(paymentGateway).cancelPayment(eq("test-payment-2"), eq(300_000L), any());
    }

    @Test
    void 이미_기록된_결제가_다시_요청되면_취소하지_않는다() {
        PaymentService paymentService = new PaymentService(paymentRepository, bookingClient, paymentGateway);

        when(bookingClient.getBooking("group-1")).thenReturn(Optional.of(
                new BookingInfoResponse("group-1", 1L, 100L, List.of(new BookingInfoResponse.BoothFeeInfo(10L, 300_000L)), true)
        ));
        // 같은 결제(test-payment-1)가 재요청된 경우 - 정상 결제라 취소하면 안 됨
        when(paymentRepository.existsByBookingId("group-1")).thenReturn(true);
        when(paymentRepository.existsByPortonePaymentId("test-payment-1")).thenReturn(true);

        assertThatThrownBy(() -> paymentService.pay("group-1", 100L, 300_000L, "CARD", "test-payment-1"))
                .isInstanceOf(CustomException.class);

        verify(paymentGateway, never()).cancelPayment(any(), any(), any());
    }
}