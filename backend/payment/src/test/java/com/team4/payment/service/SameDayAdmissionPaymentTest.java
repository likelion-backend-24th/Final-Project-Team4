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

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SameDayAdmissionPaymentTest {

    @Mock private AdmissionPaymentRepository admissionPaymentRepository;
    @Mock private ReservationClient reservationClient;
    @Mock private PaymentGateway paymentGateway;

    private static final List<LocalDate> ONE_DATE = List.of(LocalDate.now());

    @Test
    void 이미_티켓을_가진_날짜가_없으면_정상_결제된다() {
        AdmissionPaymentService service =
                new AdmissionPaymentService(admissionPaymentRepository, reservationClient, paymentGateway);

        when(reservationClient.getAdmissionContext(100L, 1L, ONE_DATE))
                .thenReturn(new AdmissionContext(1L, 100L, List.of(), 20_000L));
        when(paymentGateway.requestPayment(any(), any(), anyLong()))
                .thenReturn(PaymentGateway.PaymentGatewayResult.succeeded());
        when(reservationClient.issueAdmissionTicket(eq(100L), eq(1L), eq(ONE_DATE)))
                .thenReturn(List.of(new AdmissionTicket(10L, LocalDate.now(), "qr-token-1", "base64-image")));
        when(admissionPaymentRepository.save(any(AdmissionPayment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        AdmissionPayment result = service.pay(100L, 1L, ONE_DATE, 20_000L, "CARD", "test-admission-1");

        assertThat(result.getStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(result.getAmount()).isEqualTo(20_000L);
        assertThat(result.getCustomerId()).isEqualTo(100L);
        assertThat(result.getExpoId()).isEqualTo(1L);
        assertThat(result.getTickets()).hasSize(1);
        assertThat(result.getTickets().get(0).getTicketId()).isEqualTo(10L);
        assertThat(result.getTickets().get(0).getQrToken()).isEqualTo("qr-token-1");
    }

    @Test
    void 이미_티켓을_가진_날짜가_섞여있으면_결제할_수_없다() {
        AdmissionPaymentService service =
                new AdmissionPaymentService(admissionPaymentRepository, reservationClient, paymentGateway);

        when(reservationClient.getAdmissionContext(100L, 1L, ONE_DATE))
                .thenReturn(new AdmissionContext(1L, 100L, ONE_DATE, 20_000L));

        assertThatThrownBy(() -> service.pay(100L, 1L, ONE_DATE, 20_000L, "CARD", "test-admission-2"))
                .isInstanceOf(CustomException.class);
    }

    @Test
    void 결제_금액이_입장_금액과_다르면_거부된다() {
        AdmissionPaymentService service =
                new AdmissionPaymentService(admissionPaymentRepository, reservationClient, paymentGateway);

        when(reservationClient.getAdmissionContext(100L, 1L, ONE_DATE))
                .thenReturn(new AdmissionContext(1L, 100L, List.of(), 20_000L));

        assertThatThrownBy(() -> service.pay(100L, 1L, ONE_DATE, 15_000L, "CARD", "test-admission-3"))
                .isInstanceOf(CustomException.class);
    }

    @Test
    void 여러_날짜_결제금액은_1일_입장료_곱하기_날짜수여야_한다() {
        AdmissionPaymentService service =
                new AdmissionPaymentService(admissionPaymentRepository, reservationClient, paymentGateway);
        List<LocalDate> threeDates = List.of(LocalDate.now(), LocalDate.now().plusDays(1), LocalDate.now().plusDays(2));

        when(reservationClient.getAdmissionContext(100L, 1L, threeDates))
                .thenReturn(new AdmissionContext(1L, 100L, List.of(), 20_000L));

        // 1일 입장료(20,000) x 3일 = 60,000이어야 하는데 20,000만 보냄 -> 거부
        assertThatThrownBy(() -> service.pay(100L, 1L, threeDates, 20_000L, "CARD", "test-admission-4"))
                .isInstanceOf(CustomException.class);
    }

    @Test
    void 지난_날짜가_섞여있으면_결제_게이트웨이_호출_전에_거부된다() {
        AdmissionPaymentService service =
                new AdmissionPaymentService(admissionPaymentRepository, reservationClient, paymentGateway);
        List<LocalDate> pastAndToday = List.of(LocalDate.now().minusDays(1), LocalDate.now());

        assertThatThrownBy(() -> service.pay(100L, 1L, pastAndToday, 40_000L, "CARD", "test-admission-5"))
                .isInstanceOf(CustomException.class);

        // Reservation의 issueAdmissionTicket이 과거 날짜를 거부하는 것과 별개로, Payment 단계에서
        // 미리 막아야 "결제는 성공, 티켓은 미발급"으로 돈만 받는 사고가 안 남 — 게이트웨이 호출 자체가 없어야 함
        verify(paymentGateway, never()).requestPayment(any(), any(), anyLong());
        verify(admissionPaymentRepository, never()).save(any());
    }

    @Test
    void 이전에_다른_날짜를_결제한_고객도_겹치지_않으면_같은_박람회를_또_결제할_수_있다() {
        AdmissionPaymentService service =
                new AdmissionPaymentService(admissionPaymentRepository, reservationClient, paymentGateway);
        List<LocalDate> anotherDate = List.of(LocalDate.now().plusDays(1));

        // "고객당 박람회당 결제 1건" 제약은 폐기됨 — 이미 결제 이력이 있어도 겹치는 날짜만 없으면
        // (blockedDates 비어있음) 통과해야 한다.
        when(reservationClient.getAdmissionContext(100L, 1L, anotherDate))
                .thenReturn(new AdmissionContext(1L, 100L, List.of(), 20_000L));
        when(paymentGateway.requestPayment(any(), any(), anyLong()))
                .thenReturn(PaymentGateway.PaymentGatewayResult.succeeded());
        when(reservationClient.issueAdmissionTicket(eq(100L), eq(1L), eq(anotherDate)))
                .thenReturn(List.of(new AdmissionTicket(11L, anotherDate.get(0), "qr-token-2", "base64-image-2")));
        when(admissionPaymentRepository.save(any(AdmissionPayment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        AdmissionPayment result = service.pay(100L, 1L, anotherDate, 20_000L, "CARD", "test-admission-6");

        assertThat(result.getStatus()).isEqualTo(PaymentStatus.PAID);
    }
}
