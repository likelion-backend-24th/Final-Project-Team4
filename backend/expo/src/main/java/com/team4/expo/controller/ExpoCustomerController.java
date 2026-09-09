package com.team4.expo.controller;

import com.team4.common.response.ApiResponse;
import com.team4.common.response.PageMeta;
import com.team4.expo.domain.BoothStatus;
import com.team4.expo.dto.CustomerBoothVehiclesResponse;
import com.team4.expo.dto.ExpoBoothsResponse;
import com.team4.expo.dto.ExpoSummaryResponse;
import com.team4.expo.service.CustomerVehicleService;
import com.team4.expo.service.ExpoService;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// 일반 방문객(고객)이 보는 공개 박람회 조회.
// 로그인 여부와 무관하게 누구나 조회 가능(gateway whiteList)
@RestController
@RequestMapping("/api/customer/expos")
public class ExpoCustomerController {

    private final ExpoService expoService;
    private final CustomerVehicleService customerVehicleService;

    public ExpoCustomerController(ExpoService expoService, CustomerVehicleService customerVehicleService) {
        this.expoService = expoService;
        this.customerVehicleService = customerVehicleService;
    }

    // 공개 박람회 목록 (OPEN만)
    @GetMapping
    public ResponseEntity<ApiResponse<PageMeta<ExpoSummaryResponse>>> listOpenExpos(@PageableDefault(size = 10, sort = "startsAt") Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(PageMeta.from(expoService.listOpenExpos(pageable))));
    }

    // 공개 박람회 단건 (헤더 정보). 비공개, 없는 박람회는 404
    @GetMapping("/{expoId}")
    public ResponseEntity<ApiResponse<ExpoSummaryResponse>> getPublicExpo(@PathVariable Long expoId) {

        return ResponseEntity.ok(ApiResponse.success(expoService.getPublicExpo(expoId)));
    }

    // 참가 확정 부스 목록 + 배너
    @GetMapping("/{expoId}/booths")
    public ResponseEntity<ApiResponse<ExpoBoothsResponse>> getPublicExpoBooths(@PathVariable Long expoId) {

        return ResponseEntity.ok(ApiResponse.success(expoService.getExpoBooths(expoId, BoothStatus.ASSIGNED)));
    }

    // 참가 확정 부스별 전시 차량 목록 (차량이 1대 이상 등록된 부스만)
    @GetMapping("/{expoId}/vehicles")
    public ResponseEntity<ApiResponse<List<CustomerBoothVehiclesResponse>>> getPublicExpoVehicles(@PathVariable Long expoId) {

        return ResponseEntity.ok(ApiResponse.success(customerVehicleService.getExpoVehicles(expoId)));
    }
}
