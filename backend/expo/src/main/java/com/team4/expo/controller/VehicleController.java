package com.team4.expo.controller;

import com.team4.common.response.ApiResponse;
import com.team4.expo.dto.VehicleAiAnalysisResponse;
import com.team4.expo.dto.VehicleImageResponse;
import com.team4.expo.dto.VehicleRequest;
import com.team4.expo.dto.VehicleResponse;
import com.team4.common.security.GatewayUser;
import com.team4.expo.service.VehicleService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/exhibitor/booths/{boothId}/vehicles")
public class VehicleController {

    private final VehicleService vehicleService;

    public VehicleController(VehicleService vehicleService) {
        this.vehicleService = vehicleService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<VehicleResponse>>> listVehicles(
            @AuthenticationPrincipal GatewayUser exhibitor,
            @PathVariable Long boothId) {
        List<VehicleResponse> response = vehicleService.listVehicles(exhibitor.getId(), boothId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<VehicleResponse>> registerVehicle(
            @AuthenticationPrincipal GatewayUser exhibitor,
            @PathVariable Long boothId,
            @Valid @RequestBody VehicleRequest request) {
        VehicleResponse response = vehicleService.registerVehicle(exhibitor.getId(), boothId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @PutMapping("/{vehicleId}")
    public ResponseEntity<ApiResponse<VehicleResponse>> updateVehicle(
            @AuthenticationPrincipal GatewayUser exhibitor,
            @PathVariable Long boothId,
            @PathVariable Long vehicleId,
            @Valid @RequestBody VehicleRequest request) {
        VehicleResponse response = vehicleService.updateVehicle(exhibitor.getId(), boothId, vehicleId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @DeleteMapping("/{vehicleId}")
    public ResponseEntity<ApiResponse<Void>> deleteVehicle(
            @AuthenticationPrincipal GatewayUser exhibitor,
            @PathVariable Long boothId,
            @PathVariable Long vehicleId) {
        vehicleService.deleteVehicle(exhibitor.getId(), boothId, vehicleId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping(value = "/{vehicleId}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<VehicleImageResponse>> addVehicleImage(
            @AuthenticationPrincipal GatewayUser exhibitor,
            @PathVariable Long boothId,
            @PathVariable Long vehicleId,
            @RequestParam("image") MultipartFile image) {
        VehicleImageResponse response = vehicleService.addVehicleImage(exhibitor.getId(), boothId, vehicleId, image);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @DeleteMapping("/{vehicleId}/images/{imageId}")
    public ResponseEntity<ApiResponse<Void>> deleteVehicleImage(
            @AuthenticationPrincipal GatewayUser exhibitor,
            @PathVariable Long boothId,
            @PathVariable Long vehicleId,
            @PathVariable Long imageId) {
        vehicleService.deleteVehicleImage(exhibitor.getId(), boothId, vehicleId, imageId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // 차량 등록 마법사 - 사진 업로드 단계에서 호출. 정면/측면/후면 등 1~여러 장을 한 번에 보낼 수 있고,
    // AI(Gemini)로 함께 분석해 스펙 초안을 돌려준다. DB에는 아무것도 저장하지 않는다.
    // 이미지가 없으면 400(검증 오류)으로 응답하고, 그 외 분석 실패는 200 + analyzed:false로 응답해
    // 프론트가 "직접 입력하기"로 자연스럽게 넘어갈 수 있게 한다 (fail-open). 사용자가 사진을 바꿔서
    // 이 API를 다시 호출하면(재분석) 매번 새로 분석한다.
    @PostMapping(value = "/analyze-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<VehicleAiAnalysisResponse>> analyzeVehicleImage(
            @AuthenticationPrincipal GatewayUser exhibitor,
            @PathVariable Long boothId,
            @RequestParam("images") List<MultipartFile> images) {
        VehicleAiAnalysisResponse response = vehicleService.analyzeVehicleImage(exhibitor.getId(), boothId, images);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}