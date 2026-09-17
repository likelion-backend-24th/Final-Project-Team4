package com.team4.payment.service;

import com.team4.payment.entity.AdmissionPayment;
import com.team4.payment.entity.AdmissionPaymentTicket;
import com.team4.payment.entity.Payment;
import com.team4.payment.entity.PaymentStatus;
import com.team4.payment.dto.RevenueResponse;
import com.team4.payment.repository.AdmissionPaymentRepository;
import com.team4.payment.repository.AdmissionPaymentTicketRepository;
import com.team4.payment.repository.PaymentRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

// payments/admission_payments/admission_payment_tickets SUM으로 매출 현황 계산
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class RevenueSummaryTest {

    @Autowired
    private PaymentRepository paymentRepository;
    @Autowired
    private AdmissionPaymentRepository admissionPaymentRepository;
    @Autowired
    private AdmissionPaymentTicketRepository admissionPaymentTicketRepository;

    private RevenueService revenueService;

    @Test
    void source별로_구분하고_환불을_차감한_순매출을_계산한다() {
        revenueService = new RevenueService(paymentRepository, admissionPaymentRepository, admissionPaymentTicketRepository);
        long expoId = 900L;

        // 부스 참가비 - PAID 1건 + CANCELLED(전액 환불) 1건 + 다른 박람회 1건(집계 제외 확인)
        savePayment(expoId, 300_000L, PaymentStatus.PAID, "booth-paid");
        savePayment(expoId, 200_000L, PaymentStatus.CANCELLED, "booth-cancelled");
        savePayment(999L, 500_000L, PaymentStatus.PAID, "booth-other-expo");
        // PENDING은 결제 완료 전이라 집계 제외
        savePayment(expoId, 100_000L, PaymentStatus.PENDING, "booth-pending");

        // 당일 입장권 - PAID 결제 1건(티켓 2장, 그중 1장만 환불)
        AdmissionPayment admissionPayment = saveAdmissionPayment(expoId, 60_000L, PaymentStatus.PAID);
        saveTicket(admissionPayment, LocalDate.now(), 30_000L, false);
        saveTicket(admissionPayment, LocalDate.now().plusDays(1), 30_000L, true);

        RevenueResponse revenue = revenueService.getRevenue(expoId);

        assertThat(revenue.getBoothFee()).isEqualTo(500_000L); // 300_000 + 200_000
        assertThat(revenue.getDayTicket()).isEqualTo(60_000L);
        assertThat(revenue.getRefundTotal()).isEqualTo(230_000L); // 부스 200_000 + 당일권 30_000
        assertThat(revenue.getNetRevenue()).isEqualTo(330_000L); // (500_000 + 60_000) - 230_000
    }

    private void savePayment(long expoId, long amount, PaymentStatus status, String bookingId) {
        paymentRepository.save(Payment.builder()
                .bookingId(bookingId)
                .userId(1L)
                .expoId(expoId)
                .portonePaymentId("MOCK-" + bookingId)
                .payMethod("CARD")
                .amount(amount)
                .status(status)
                .build());
    }

    private AdmissionPayment saveAdmissionPayment(long expoId, long amount, PaymentStatus status) {
        return admissionPaymentRepository.save(AdmissionPayment.builder()
                .customerId(1L)
                .expoId(expoId)
                .portonePaymentId("MOCK-ADM-" + expoId + "-" + amount)
                .payMethod("CARD")
                .amount(amount)
                .status(status)
                .build());
    }

    private void saveTicket(AdmissionPayment admissionPayment, LocalDate visitDate, long amount, boolean refunded) {
        AdmissionPaymentTicket ticket = AdmissionPaymentTicket.builder()
                .admissionPayment(admissionPayment)
                .visitDate(visitDate)
                .ticketId(1L)
                .qrToken("qr-" + amount + "-" + visitDate)
                .amount(amount)
                .build();
        if (refunded) {
            ticket.markRefunded("고객 요청", LocalDateTime.now());
        }
        admissionPaymentTicketRepository.save(ticket);
    }
}
