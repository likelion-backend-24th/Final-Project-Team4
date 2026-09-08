package com.team4.expo.controller;

import com.team4.common.response.ApiResponse;
import com.team4.common.response.PageMeta;
import com.team4.expo.dto.ExpoSummaryResponse;
import com.team4.expo.service.ExpoService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// 일반 방문객(고객)이 보는 공개 박람회 목록. 로그인 여부와 무관하게 누구나 조회 가능(permitAll).
@RestController
@RequestMapping("/api/customer/expos")
public class ExpoCustomerController {

    private final ExpoService expoService;

    public ExpoCustomerController(ExpoService expoService) {
        this.expoService = expoService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageMeta<ExpoSummaryResponse>>> listOpenExpos(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(PageMeta.from(expoService.listOpenExpos(pageable))));
    }
}
