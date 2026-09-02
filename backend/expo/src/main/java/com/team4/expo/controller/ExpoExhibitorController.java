package com.team4.expo.controller;

import com.team4.common.response.ApiResponse;
import com.team4.expo.dto.BoothApplicationRequest;
import com.team4.expo.dto.BoothApplicationResponse;
import com.team4.expo.service.ExpoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/exhibitor/booth-applications")
public class ExpoExhibitorController {

    private final ExpoService expoService;

    public ExpoExhibitorController(ExpoService expoService) {
        this.expoService = expoService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BoothApplicationResponse>> applyBooth(
            @RequestHeader("X-User-Id") Long exhibitorId,
            @Valid @RequestBody BoothApplicationRequest request) {
        BoothApplicationResponse response = expoService.applyBooth(exhibitorId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }
}
