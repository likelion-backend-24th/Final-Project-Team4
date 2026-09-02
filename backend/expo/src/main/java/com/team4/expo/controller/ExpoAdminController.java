package com.team4.expo.controller;

import com.team4.common.response.ApiResponse;
import com.team4.expo.dto.ExpoRegisterRequest;
import com.team4.expo.dto.ExpoResponse;
import com.team4.expo.service.ExpoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/expos")
public class ExpoAdminController {

    private final ExpoService expoService;

    public ExpoAdminController(ExpoService expoService) {
        this.expoService = expoService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ExpoResponse>> registerExpo(
            @Valid @RequestBody ExpoRegisterRequest request) {
        ExpoResponse response = expoService.registerExpo(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @PostMapping("/{expoId}/open")
    public ResponseEntity<ApiResponse<ExpoResponse>> openExpo(@PathVariable Long expoId) {
        ExpoResponse response = expoService.openExpo(expoId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}