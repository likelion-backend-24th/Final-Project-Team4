package com.team4.payment.controller;

import com.team4.payment.dto.RevenueResponse;
import com.team4.payment.service.RevenueService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// 관리자 박람회별 매출 현황
@RestController
@RequestMapping("/api/admin/expos/{expoId}/revenue")
@RequiredArgsConstructor
public class RevenueController {
    private final RevenueService revenueService;

    @GetMapping
    public RevenueResponse getRevenue(@PathVariable Long expoId) {
        return revenueService.getRevenue(expoId);
    }
}
