package com.team4.payment.controller;

import com.team4.payment.dto.PaymentStatsEntryResponse;
import com.team4.payment.dto.RefundLogResponse;
import com.team4.payment.service.PaymentStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

// 관리자 박람회별 결제, 환불 통계(일 단위) - ADMIN 롤 검증은 SecurityConfig에서 처리
@RestController
@RequestMapping("/api/admin/stats/payments")
@RequiredArgsConstructor
public class PaymentStatsController {
    private final PaymentStatsService paymentStatsService;

    @GetMapping
    public List<PaymentStatsEntryResponse> getStats(@RequestParam Long expoId,
                                                    @RequestParam LocalDate from,
                                                    @RequestParam LocalDate to) {
        return paymentStatsService.getDailyStats(expoId, from, to);
    }

    // 하루치 취소표(당일 입장권 환불) 내역 목록, 최근 환불순 최대 20건
    @GetMapping("/refunds")
    public List<RefundLogResponse> getRefundLogs(@RequestParam Long expoId,
                                                  @RequestParam LocalDate date) {
        return paymentStatsService.getRefundLogs(expoId, date);
    }
}
