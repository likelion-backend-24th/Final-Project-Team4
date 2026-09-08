package com.team4.payment.service;

import com.team4.common.error.CustomException;
import com.team4.payment.client.AdmissionContext;
import com.team4.payment.client.AdmissionTicket;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SameDayAdmissionPaymentTest {

    @Mock private AdmissionPaymentRepository admissionPaymentRepository;
    @Mock private ReservationClient reservationClient;
    @Mock private PaymentGateway paymentGateway;

    @Test
    void 무료_QR이_없는_고객은_정상_결제된다() {
        AdmissionPaymentService service =
                new AdmissionPaymentService(admissionPaymentRepository, reservationClient, paymentGateway);

        when(reservationClient.getAdmissionContext(100L, 1L))
                .thenReturn(new AdmissionContext(1L, 100L, false, 20_000L));
        when(admissionPaymentRepository.existsByCustomerIdAndExpoId(100L, 1L)).thenReturn(false);
        when(paymentGateway.requestPayment(any(), any(), anyLong()))
                .thenReturn(PaymentGateway.PaymentGatewayResult.succeeded());
        when(reservationClient.issueAdmissionTicket(eq(100L), eq(1L), any()))
                .thenReturn(new AdmissionTicket(10L, "qr-token-1", "base64-image"));
        when(admissionPaymentRepository.save(any(AdmissionPayment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        AdmissionPayment result = service.pay(100L, 1L, 20_000L, "CARD", "test-admission-1");

        assertThat(result.getStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(result.getAmount()).isEqualTo(20_000L);
        assertThat(result.getCustomerId()).isEqualTo(100L);
        assertThat(result.getExpoId()).isEqualTo(1L);
        assertThat(result.getTicketId()).isEqualTo(10L);
        assertThat(result.getQrToken()).isEqualTo("qr-token-1");
    }

    @Test
    void 이미_무료_QR을_보유한_고객은_결제할_수_없다() {
        AdmissionPaymentService service =
                new AdmissionPaymentService(admissionPaymentRepository, reservationClient, paymentGateway);

        when(reservationClient.getAdmissionContext(100L, 1L))
                .thenReturn(new AdmissionContext(1L, 100L, true, 20_000L));

        assertThatThrownBy(() -> service.pay(100L, 1L, 20_000L, "CARD", "test-admission-2"))
                .isInstanceOf(CustomException.class);
    }

    @Test
    void 결제_금액이_입장_금액과_다르면_거부된다() {
        AdmissionPaymentService service =
                new AdmissionPaymentService(admissionPaymentRepository, reservationClient, paymentGateway);

        when(reservationClient.getAdmissionContext(100L, 1L))
                .thenReturn(new AdmissionContext(1L, 100L, false, 20_000L));
        when(admissionPaymentRepository.existsByCustomerIdAndExpoId(100L, 1L)).thenReturn(false);

        assertThatThrownBy(() -> service.pay(100L, 1L, 15_000L, "CARD", "test-admission-3"))
                .isInstanceOf(CustomException.class);
    }

    @Test
    void 이미_결제된_건은_중복_결제가_차단된다() {
        AdmissionPaymentService service =
                new AdmissionPaymentService(admissionPaymentRepository, reservationClient, paymentGateway);

        when(reservationClient.getAdmissionContext(100L, 1L))
                .thenReturn(new AdmissionContext(1L, 100L, false, 20_000L));
        when(admissionPaymentRepository.existsByCustomerIdAndExpoId(100L, 1L)).thenReturn(true);

        assertThatThrownBy(() -> service.pay(100L, 1L, 20_000L, "CARD", "test-admission-4"))
                .isInstanceOf(CustomException.class);
    }

    @Test
    void 결제_실패시_FAILED_상태로_저장되고_PAID로_저장되지_않는다() {
        AdmissionPaymentService service =
                new AdmissionPaymentService(admissionPaymentRepository, reservationClient, paymentGateway);

        when(reservationClient.getAdmissionContext(100L, 1L))
                .thenReturn(new AdmissionContext(1L, 100L, false, 20_000L));
        when(admissionPaymentRepository.existsByCustomerIdAndExpoId(100L, 1L)).thenReturn(false);
        when(paymentGateway.requestPayment(any(), any(), anyLong()))
                .thenReturn(PaymentGateway.PaymentGatewayResult.failure("잔액 부족"));
        when(admissionPaymentRepository.save(any(AdmissionPayment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        AdmissionPayment result = service.pay(100L, 1L, 20_000L, "CARD", "test-admission-5");

        assertThat(result.getStatus()).isEqualTo(PaymentStatus.FAILED);
    }
}
