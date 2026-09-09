package com.team4.expo.controller;

import com.team4.common.response.ApiResponse;
import com.team4.expo.dto.VehicleImageResponse;
import com.team4.expo.dto.VehicleRequest;
import com.team4.expo.dto.VehicleResponse;
import com.team4.expo.security.GatewayUser;
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
}
