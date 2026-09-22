package com.team4.payment.service;

import com.team4.payment.dto.PaymentStatsEntryResponse;
import com.team4.payment.dto.RefundLogResponse;
import com.team4.payment.entity.AdmissionPayment;
import com.team4.payment.entity.AdmissionPaymentTicket;
import com.team4.payment.entity.Payment;
import com.team4.payment.entity.PaymentStatus;
import com.team4.payment.repository.AdmissionPaymentRepository;
import com.team4.payment.repository.AdmissionPaymentTicketRepository;
import com.team4.payment.repository.PaymentRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

// source(BOOTH_FEE/DAY_TICKET)별로 나뉜 일별 결제, 환불 시계열 계산.
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class PaymentStatsTest {

    @Autowired
    private PaymentRepository paymentRepository;
    @Autowired
    private AdmissionPaymentRepository admissionPaymentRepository;
    @Autowired
    private AdmissionPaymentTicketRepository admissionPaymentTicketRepository;
    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void source별_일별_결제_환불_통계를_계산하고_PENDING은_제외한다() {
        PaymentStatsService statsService = new PaymentStatsService(paymentRepository, admissionPaymentRepository, admissionPaymentTicketRepository);
        long expoId = 901L;
        LocalDate day1 = LocalDate.now();
        LocalDate day2 = day1.plusDays(1);

        // 부스 참가비 - day1에 결제 1건(PAID), day2에 그 결제가 환불(CANCELLED)됨
        Payment boothPayment = savePayment(expoId, 300_000L, PaymentStatus.PAID, "booth-1", day1.atTime(10, 0));
        boothPayment.cancel("고객 요청", day2.atTime(9, 0));
        paymentRepository.save(boothPayment);
        // PENDING 건 - 통계에서 제외
        savePayment(expoId, 999_999L, PaymentStatus.PENDING, "booth-pending", day1.atTime(11, 0));

        // 당일 입장권 - day1에 결제 1건(티켓 1장), 환불 없음
        AdmissionPayment admissionPayment = saveAdmissionPayment(expoId, 30_000L, day1.atTime(12, 0));
        saveTicket(admissionPayment, day1, 30_000L);

        List<PaymentStatsEntryResponse> stats = statsService.getDailyStats(expoId, day1, day2);

        PaymentStatsEntryResponse boothDay1 = find(stats, day1, "BOOTH_FEE");
        assertThat(boothDay1.getPaidCount()).isEqualTo(1);
        assertThat(boothDay1.getPaidAmount()).isEqualTo(300_000L);
        assertThat(boothDay1.getRefundCount()).isEqualTo(0);

        PaymentStatsEntryResponse boothDay2 = find(stats, day2, "BOOTH_FEE");
        assertThat(boothDay2.getRefundCount()).isEqualTo(1);
        assertThat(boothDay2.getRefundAmount()).isEqualTo(300_000L);
        assertThat(boothDay2.getPaidCount()).isEqualTo(0); // day2엔 새 결제 없음, 환불만 있음

        PaymentStatsEntryResponse dayTicketDay1 = find(stats, day1, "DAY_TICKET");
        assertThat(dayTicketDay1.getPaidCount()).isEqualTo(1);
        assertThat(dayTicketDay1.getPaidAmount()).isEqualTo(30_000L);
        assertThat(dayTicketDay1.getNet()).isEqualTo(30_000L);

        // PENDING 건(999_999원)이 어느 날짜에도 섞여 들어가지 않았는지 확인
        assertThat(stats.stream().mapToLong(PaymentStatsEntryResponse::getPaidAmount).sum()).isEqualTo(330_000L);
    }

    @Test
    void 취소표_내역은_최근_환불순으로_반환한다() {
        PaymentStatsService statsService = new PaymentStatsService(paymentRepository, admissionPaymentRepository, admissionPaymentTicketRepository);
        long expoId = 902L;
        LocalDate today = LocalDate.now();

        AdmissionPayment admissionPayment = saveAdmissionPayment(expoId, 60_000L, today.atTime(9, 0));
        AdmissionPaymentTicket early = saveTicket(admissionPayment, today, 30_000L);
        early.markRefunded("일정 변경", today.atTime(10, 0));
        admissionPaymentTicketRepository.save(early);
        AdmissionPaymentTicket late = saveTicket(admissionPayment, today.plusDays(1), 30_000L);
        late.markRefunded("단순 변심", today.atTime(15, 0));
        admissionPaymentTicketRepository.save(late);
        // 환불 안 된 티켓 - 목록에서 빠져야 함
        saveTicket(admissionPayment, today.plusDays(2), 30_000L);

        List<RefundLogResponse> logs = statsService.getRefundLogs(expoId, today);

        assertThat(logs).hasSize(2);
        assertThat(logs.get(0).getRefundReason()).isEqualTo("단순 변심"); // 15시가 더 최근이라 먼저 나옴
        assertThat(logs.get(0).getAmount()).isEqualTo(30_000L);
        assertThat(logs.get(1).getRefundReason()).isEqualTo("일정 변경");
    }

    private PaymentStatsEntryResponse find(List<PaymentStatsEntryResponse> stats, LocalDate date, String source) {
        return stats.stream()
                .filter(e -> e.getDate().equals(date) && e.getSource().equals(source))
                .findFirst()
                .orElseThrow(() -> new AssertionError("no entry for " + date + " " + source));
    }

    private Payment savePayment(long expoId, long amount, PaymentStatus status, String bookingId, LocalDateTime createdAt) {
        Payment payment = paymentRepository.save(Payment.builder()
                .bookingId(bookingId)
                .userId(1L)
                .expoId(expoId)
                .portonePaymentId("MOCK-" + bookingId)
                .payMethod("CARD")
                .amount(amount)
                .status(status)
                .build());

        jdbcTemplate.update("UPDATE payments SET created_at = ? WHERE id = ?", createdAt, payment.getId());
        return payment;
    }

    private AdmissionPayment saveAdmissionPayment(long expoId, long amount, LocalDateTime createdAt) {
        AdmissionPayment admissionPayment = admissionPaymentRepository.save(AdmissionPayment.builder()
                .customerId(1L)
                .expoId(expoId)
                .portonePaymentId("MOCK-ADM-" + expoId + "-" + amount)
                .payMethod("CARD")
                .amount(amount)
                .status(PaymentStatus.PAID)
                .build());
        jdbcTemplate.update("UPDATE admission_payments SET created_at = ? WHERE id = ?", createdAt, admissionPayment.getId());
        return admissionPayment;
    }

    private AdmissionPaymentTicket saveTicket(AdmissionPayment admissionPayment, LocalDate visitDate, long amount) {
        return admissionPaymentTicketRepository.save(AdmissionPaymentTicket.builder()
                .admissionPayment(admissionPayment)
                .visitDate(visitDate)
                .ticketId(1L)
                .qrToken("qr-" + amount + "-" + visitDate)
                .amount(amount)
                .build());
    }
}
