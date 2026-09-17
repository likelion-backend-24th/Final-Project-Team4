package com.team4.payment.service;

import com.team4.payment.dto.PaymentStatsEntryResponse;
import com.team4.payment.repository.AdmissionPaymentRepository;
import com.team4.payment.repository.AdmissionPaymentTicketRepository;
import com.team4.payment.repository.DailyAmountCount;
import com.team4.payment.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

// 관리자 박람회별 결제, 환불 통계(일 단위). source(BOOTH_FEE/DAY_TICKET)별로 나눠서 날짜순으로 반환.
// 결제 지표는 결제일(created_at) 기준, 환불 지표는 환불일(cancelled_at/refunded_at) 기준으로 각각 집계 후 날짜로 합침.
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PaymentStatsService {

    private static final String BOOTH_FEE = "BOOTH_FEE";
    private static final String DAY_TICKET = "DAY_TICKET";

    private final PaymentRepository paymentRepository;
    private final AdmissionPaymentRepository admissionPaymentRepository;
    private final AdmissionPaymentTicketRepository admissionPaymentTicketRepository;

    public List<PaymentStatsEntryResponse> getDailyStats(Long expoId, LocalDate from, LocalDate to) {
        LocalDateTime fromInclusive = from.atStartOfDay();
        LocalDateTime toExclusive = to.plusDays(1).atStartOfDay();

        List<PaymentStatsEntryResponse> boothFee =  merge(
                BOOTH_FEE,
                paymentRepository.findDailyPaidByExpoId(expoId, fromInclusive, toExclusive),
                paymentRepository.findDailyRefundedByExpoId(expoId, fromInclusive, toExclusive)
        );

        List<PaymentStatsEntryResponse> dayTicket = merge(
                DAY_TICKET,
                admissionPaymentRepository.findDailyPaidByExpoId(expoId, fromInclusive, toExclusive),
                admissionPaymentTicketRepository.findDailyRefundedByExpoId(expoId, fromInclusive, toExclusive)
        );

        List<PaymentStatsEntryResponse> result = new ArrayList<>(boothFee);
        result.addAll(dayTicket);
        result.sort(Comparator.comparing(PaymentStatsEntryResponse::getDate).thenComparing(PaymentStatsEntryResponse::getSource));

        return result;
    }

    // paid/refund 두 쿼리 결과를 날짜 기준으로 합쳐 하나의 시계열로 만듦
    private List<PaymentStatsEntryResponse> merge(String source, List<DailyAmountCount> paid, List<DailyAmountCount> refund) {
        Map<LocalDate, long[]> byDay = new TreeMap<>(); // [paidCount, paidAmount, refundCount, refundAmount]

        for (DailyAmountCount row : paid) {
            byDay.computeIfAbsent(row.getDay(), d -> new long[4])[0] = row.getCnt();
            byDay.get(row.getDay())[1] = row.getAmt();
        }

        for (DailyAmountCount row : refund) {
            byDay.computeIfAbsent(row.getDay(), d -> new long[4])[2] = row.getCnt();
            byDay.get(row.getDay())[3] = row.getAmt();
        }

        List<PaymentStatsEntryResponse> entries = new ArrayList<>();
        byDay.forEach((day, v) -> entries.add(new PaymentStatsEntryResponse(day, source, v[0], v[1], v[2], v[3], v[1] - v[3])));

        return entries;
    }
}
