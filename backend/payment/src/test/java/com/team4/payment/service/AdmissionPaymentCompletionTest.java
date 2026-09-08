package com.team4.payment.service;

import com.team4.payment.client.AdmissionContext;
import com.team4.payment.client.ReservationClient;
import com.team4.payment.entity.AdmissionPayment;
import com.team4.payment.entity.PaymentStatus;
import com.team4.payment.gateway.PaymentGateway;
import com.team4.payment.repository.AdmissionPaymentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdmissionPaymentCompletionTest {

    @Mock private AdmissionPaymentRepository admissionPaymentRepository;
    @Mock private ReservationClient reservationClient;
    @Mock private PaymentGateway paymentGateway;

    @Test
    void 결제_성공시에만_Reservation에_발급_통보가_1번_전달된다() {
        AdmissionPaymentService service =
                new AdmissionPaymentService(admissionPaymentRepository, reservationClient, paymentGateway);

        when(reservationClient.getAdmissionContext(100L, 1L))
                .thenReturn(new AdmissionContext(1L, 100L, false, 20_000L));
        when(admissionPaymentRepository.existsByCustomerIdAndExpoId(100L, 1L)).thenReturn(false);
        when(paymentGateway.requestPayment(any(), any(), anyLong()))
                .thenReturn(PaymentGateway.PaymentGatewayResult.succeeded());
        when(admissionPaymentRepository.save(any(AdmissionPayment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service.pay(100L, 1L, 20_000L, "CARD", "test-admission-complete-1");

        // 성공 건은 Reservation한테 딱 1번만 통보되어야 함 (중복 발급 요청 방지)
        verify(reservationClient, times(1))
                .confirmAdmissionPayment(eq(100L), eq(1L), eq("test-admission-complete-1"), any());
    }

    @Test
    void 결제_실패시에는_Reservation에_통보하지_않는다() {
        AdmissionPaymentService service =
                new AdmissionPaymentService(admissionPaymentRepository, reservationClient, paymentGateway);

        when(reservationClient.getAdmissionContext(100L, 1L))
                .thenReturn(new AdmissionContext(1L, 100L, false, 20_000L));
        when(admissionPaymentRepository.existsByCustomerIdAndExpoId(100L, 1L)).thenReturn(false);
        when(paymentGateway.requestPayment(any(), any(), anyLong()))
                .thenReturn(PaymentGateway.PaymentGatewayResult.failure("잔액 부족"));
        when(admissionPaymentRepository.save(any(AdmissionPayment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service.pay(100L, 1L, 20_000L, "CARD", "test-admission-complete-2");

        verify(reservationClient, never())
                .confirmAdmissionPayment(any(), any(), any(), any());
    }

    @Test
    void Reservation_통보가_실패해도_이미_저장된_결제_완료_데이터는_그대로_유지된다() {
        AdmissionPaymentService service =
                new AdmissionPaymentService(admissionPaymentRepository, reservationClient, paymentGateway);

        when(reservationClient.getAdmissionContext(100L, 1L))
                .thenReturn(new AdmissionContext(1L, 100L, false, 20_000L));
        when(admissionPaymentRepository.existsByCustomerIdAndExpoId(100L, 1L)).thenReturn(false);
        when(paymentGateway.requestPayment(any(), any(), anyLong()))
                .thenReturn(PaymentGateway.PaymentGatewayResult.succeeded());
        when(admissionPaymentRepository.save(any(AdmissionPayment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        // Reservation 서버 장애 상황을 가정
        doThrow(new RuntimeException("Reservation 서버 통신 실패"))
                .when(reservationClient).confirmAdmissionPayment(any(), any(), any(), any());

        AdmissionPayment result = service.pay(100L, 1L, 20_000L, "CARD", "test-admission-complete-3");

        // Reservation 통보가 실패해도 예외가 밖으로 안 나가고, 결제 완료 상태는 그대로 유지되어야 함
        assertThat(result.getStatus()).isEqualTo(PaymentStatus.PAID);
    }
}