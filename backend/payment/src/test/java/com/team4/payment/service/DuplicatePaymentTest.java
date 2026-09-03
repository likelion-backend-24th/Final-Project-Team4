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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DuplicatePaymentTest {

    @Mock private PaymentRepository paymentRepository;
    @Mock private BookingClient bookingClient;
    @Mock private PaymentGateway paymentGateway;

    @Test
    void 이미_결제완료된_신청은_재결제가_차단된다() {
        PaymentService paymentService = new PaymentService(paymentRepository, bookingClient, paymentGateway);

        when(bookingClient.getBooking(1L)).thenReturn(Optional.of(
                new BookingInfoResponse(1L, 1L, List.of(new BookingInfoResponse.BoothFeeInfo(10L, 300_000L)), true)
        ));
        // 이미 결제된 상태로 가정
        when(paymentRepository.existsByBookingId(1L)).thenReturn(true);

        assertThatThrownBy(() -> paymentService.pay(1L, 100L, 300_000L, "CARD"))
                .isInstanceOf(CustomException.class);

        // 중복이면 결제 게이트웨이 호출도, 저장도 절대 일어나면 안 됨
        verify(paymentGateway, never()).requestPayment(any(), anyLong(), anyLong());
        verify(paymentRepository, never()).save(any());
    }
}