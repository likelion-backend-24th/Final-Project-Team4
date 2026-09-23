package com.team4.expo.vehicle.controller;

import com.team4.common.response.ApiResponse;
import com.team4.expo.vehicle.dto.VehicleSearchResponse;
import com.team4.expo.vehicle.service.CustomerVehicleService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// 자연어 차량 검색 - 박람회 목록 화면에서 노출 중인(OPEN) 박람회 전체를 대상으로 검색
@RestController
@RequestMapping("/api/customer/vehicles")
public class CustomerVehicleSearchController {

    private final CustomerVehicleService customerVehicleService;

    public CustomerVehicleSearchController(CustomerVehicleService customerVehicleService) {
        this.customerVehicleService = customerVehicleService;
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<VehicleSearchResponse>> searchVehicles(@RequestParam String query) {
        return ResponseEntity.ok(ApiResponse.success(customerVehicleService.searchVehicles(query)));
    }
}
