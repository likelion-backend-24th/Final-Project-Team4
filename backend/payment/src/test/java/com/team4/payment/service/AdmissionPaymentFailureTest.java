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
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class AdmissionPaymentFailureTest {
    @Mock private AdmissionPaymentRepository admissionPaymentRepository;
    @Mock private ReservationClient reservationClient;
    @Mock private PaymentGateway paymentGateway;

    @Test
    void 결제_실패시_FAILED_상태로_저장되고_PAID로_저장되지_않는다(){
        AdmissionPaymentService service =
                new AdmissionPaymentService(admissionPaymentRepository, reservationClient, paymentGateway);

        when(reservationClient.getAdmissionContext(100L, 1L))
                .thenReturn(new AdmissionContext(1L, 100L, false, 20_000L));
        when(admissionPaymentRepository.existsByCustomerIdAndExpoId(100L, 1L)).thenReturn(false);
        when(paymentGateway.requestPayment(any(), any(), anyLong()))
                .thenReturn(PaymentGateway.PaymentGatewayResult.failure("잔액 부족"));
        when(admissionPaymentRepository.save(any(AdmissionPayment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        AdmissionPayment result = service.pay(100L, 1L, 20_000L, "CARD", "test-admission-fail-1");

        assertThat(result.getStatus()).isEqualTo(PaymentStatus.FAILED);
        assertThat(result.getStatus()).isNotEqualTo(PaymentStatus.PAID);
        assertThat(result.getCancelReason()).isEqualTo("잔액 부족");
    }
}