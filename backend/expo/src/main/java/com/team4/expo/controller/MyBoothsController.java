package com.team4.expo.controller;

import com.team4.common.response.ApiResponse;
import com.team4.expo.dto.MyBoothResponse;
import com.team4.common.security.GatewayUser;
import com.team4.expo.service.LeadService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// 참가업체가 QR 리드 화면에서 본인 부스를 고를 때 쓰는 목록(참가 확정된 부스만).
@RestController
@RequestMapping("/api/exhibitor/booths/mine")
public class MyBoothsController {

    private final LeadService leadService;

    public MyBoothsController(LeadService leadService) {
        this.leadService = leadService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<MyBoothResponse>>> listMyBooths(
            @AuthenticationPrincipal GatewayUser exhibitor) {

        return ResponseEntity.ok(ApiResponse.success(leadService.listMyBooths(exhibitor.getId())));
    }
}
