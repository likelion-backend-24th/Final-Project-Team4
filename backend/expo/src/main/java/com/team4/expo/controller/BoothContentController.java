package com.team4.expo.controller;

import com.team4.common.response.ApiResponse;
import com.team4.expo.dto.BoothContentRequest;
import com.team4.expo.dto.BoothContentResponse;
import com.team4.expo.security.GatewayUser;
import com.team4.expo.service.BoothContentService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/exhibitor/booths")
public class BoothContentController {

    private final BoothContentService boothContentService;

    public BoothContentController(BoothContentService boothContentService) {
        this.boothContentService = boothContentService;
    }

    @PutMapping("/{boothId}/content")
    public ResponseEntity<ApiResponse<BoothContentResponse>> updateContent(
            @AuthenticationPrincipal GatewayUser exhibitor,
            @PathVariable Long boothId,
            @Valid @RequestBody BoothContentRequest request) {
        BoothContentResponse response = boothContentService.registerOrUpdateContent(exhibitor.getId(), boothId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping(value = "/{boothId}/banner-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<Map<String, String>>> updateBannerImage(
            @AuthenticationPrincipal GatewayUser exhibitor,
            @PathVariable Long boothId,
            @RequestParam("image") MultipartFile image) {
        String bannerImageUrl = boothContentService.updateBannerImage(exhibitor.getId(), boothId, image);
        return ResponseEntity.ok(ApiResponse.success(Map.of("bannerImageUrl", bannerImageUrl)));
    }
}
