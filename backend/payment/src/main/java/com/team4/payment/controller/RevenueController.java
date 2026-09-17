package com.team4.payment.controller;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.payment.dto.RevenueResponse;
import com.team4.payment.service.RevenueService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// 관리자 박람회별 매출 현황. 헤더 없으면 MissingRequestHeaderException -> GlobalExceptionHandler가 401 처리.
@RestController
@RequestMapping("/api/admin/expos/{expoId}/revenue")
@RequiredArgsConstructor
public class RevenueController {
    private final RevenueService revenueService;

    @GetMapping
    public RevenueResponse getRevenue(@PathVariable Long expoId, @RequestHeader("X-User-Role") String role) {
        if (!"ADMIN".equals(role)) {
            throw new CustomException(ErrorCode.FORBIDDEN, "관리자만 매출 현황을 조회할 수 있습니다.");
        }
        return revenueService.getRevenue(expoId);
    }
}
