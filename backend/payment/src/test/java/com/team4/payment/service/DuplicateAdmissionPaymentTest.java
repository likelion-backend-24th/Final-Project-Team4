package com.team4.payment.service;

import com.team4.common.error.CustomException;
import com.team4.payment.client.AdmissionContext;
import com.team4.payment.client.ReservationClient;
import com.team4.payment.gateway.PaymentGateway;
import com.team4.payment.repository.AdmissionPaymentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DuplicateAdmissionPaymentTest {

    @Mock private AdmissionPaymentRepository admissionPaymentRepository;
    @Mock private ReservationClient reservationClient;
    @Mock private PaymentGateway paymentGateway;

    @Test
    void 이미_결제완료된_고객은_같은_박람회_재결제가_차단된다() {
        AdmissionPaymentService service =
                new AdmissionPaymentService(admissionPaymentRepository, reservationClient, paymentGateway);

        when(reservationClient.getAdmissionContext(100L, 1L))
                .thenReturn(new AdmissionContext(1L, 100L, false, 20_000L));
        // 이미 결제된 상태로 가정
        when(admissionPaymentRepository.existsByCustomerIdAndExpoId(100L, 1L)).thenReturn(true);

        assertThatThrownBy(() -> service.pay(100L, 1L, 20_000L, "CARD", "test-admission-dup-1"))
                .isInstanceOf(CustomException.class);

        // 중복이면 결제 게이트웨이 호출도, 저장도 절대 일어나면 안 됨
        verify(paymentGateway, never()).requestPayment(any(), any(), anyLong());
        verify(admissionPaymentRepository, never()).save(any());
    }
}
