package com.team4.payment.service;

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

import java.time.LocalDate;
import java.util.List;

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

    private static final List<LocalDate> ONE_DATE = List.of(LocalDate.now());

    @Test
    void 결제_성공시에만_Reservation에_티켓_발급이_1번_요청된다() {
        AdmissionPaymentService service =
                new AdmissionPaymentService(admissionPaymentRepository, reservationClient, paymentGateway);

        when(reservationClient.getAdmissionContext(100L, 1L, ONE_DATE))
                .thenReturn(new AdmissionContext(1L, 100L, List.of(), 20_000L));
        when(paymentGateway.requestPayment(any(), any(), anyLong()))
                .thenReturn(PaymentGateway.PaymentGatewayResult.succeeded());
        when(reservationClient.issueAdmissionTicket(eq(100L), eq(1L), eq(ONE_DATE)))
                .thenReturn(List.of(new AdmissionTicket(999L, LocalDate.now(), "qr-token-abc", "base64-image-data")));
        when(admissionPaymentRepository.save(any(AdmissionPayment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        AdmissionPayment result = service.pay(100L, 1L, ONE_DATE, 20_000L, "CARD", "test-admission-complete-1");

        // 성공 건은 Reservation한테 딱 1번만 티켓 발급 요청되어야 함 (중복 발급 요청 방지)
        verify(reservationClient, times(1))
                .issueAdmissionTicket(eq(100L), eq(1L), eq(ONE_DATE));
        // 발급받은 티켓 정보가 결제 데이터에 그대로 저장되어야 함
        assertThat(result.getTickets()).hasSize(1);
        assertThat(result.getTickets().get(0).getTicketId()).isEqualTo(999L);
        assertThat(result.getTickets().get(0).getQrToken()).isEqualTo("qr-token-abc");
        assertThat(result.getTickets().get(0).getQrImageBase64()).isEqualTo("base64-image-data");
    }

    @Test
    void 결제_실패시에는_Reservation에_티켓_발급을_요청하지_않는다() {
        AdmissionPaymentService service =
                new AdmissionPaymentService(admissionPaymentRepository, reservationClient, paymentGateway);

        when(reservationClient.getAdmissionContext(100L, 1L, ONE_DATE))
                .thenReturn(new AdmissionContext(1L, 100L, List.of(), 20_000L));
        when(paymentGateway.requestPayment(any(), any(), anyLong()))
                .thenReturn(PaymentGateway.PaymentGatewayResult.failure("잔액 부족"));
        when(admissionPaymentRepository.save(any(AdmissionPayment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service.pay(100L, 1L, ONE_DATE, 20_000L, "CARD", "test-admission-complete-2");

        verify(reservationClient, never())
                .issueAdmissionTicket(any(), any(), any());
    }

    @Test
    void Reservation_티켓_발급이_실패해도_이미_완료된_결제_데이터는_그대로_유지된다() {
        AdmissionPaymentService service =
                new AdmissionPaymentService(admissionPaymentRepository, reservationClient, paymentGateway);

        when(reservationClient.getAdmissionContext(100L, 1L, ONE_DATE))
                .thenReturn(new AdmissionContext(1L, 100L, List.of(), 20_000L));
        when(paymentGateway.requestPayment(any(), any(), anyLong()))
                .thenReturn(PaymentGateway.PaymentGatewayResult.succeeded());
        when(admissionPaymentRepository.save(any(AdmissionPayment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        // Reservation 서버 장애 상황을 가정
        doThrow(new RuntimeException("Reservation 서버 통신 실패"))
                .when(reservationClient).issueAdmissionTicket(any(), any(), any());

        AdmissionPayment result = service.pay(100L, 1L, ONE_DATE, 20_000L, "CARD", "test-admission-complete-3");

        // 티켓 발급이 실패해도 예외가 밖으로 안 나가고, 결제 완료 상태는 그대로 유지되어야 함
        assertThat(result.getStatus()).isEqualTo(PaymentStatus.PAID);
        // 티켓 정보는 비어있는 채로 저장됨 (추후 재시도 대상)
        assertThat(result.getTickets()).isEmpty();
    }
}
