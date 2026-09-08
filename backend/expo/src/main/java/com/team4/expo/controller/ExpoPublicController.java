package com.team4.expo.controller;

import com.team4.common.response.ApiResponse;
import com.team4.common.response.PageMeta;
import com.team4.expo.domain.BoothStatus;
import com.team4.expo.dto.BoothContentResponse;
import com.team4.expo.dto.ExpoBoothsResponse;
import com.team4.expo.dto.ExpoSummaryResponse;
import com.team4.expo.service.ExpoService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// 비회원 공개 조회 API
@RestController
@RequestMapping("/api/expos")
public class ExpoPublicController {

    private final ExpoService expoService;

    public ExpoPublicController(ExpoService expoService) {
        this.expoService = expoService;
    }

    // 공개 박람회 목록 (OPEN만)
    @GetMapping
    public ResponseEntity<ApiResponse<PageMeta<ExpoSummaryResponse>>> listPublicExpos(
            @PageableDefault(size = 10, sort = "startsAt") Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(PageMeta.from(expoService.listOpenExpos(pageable))));
    }

    // 공개 박람회 단건 (헤더 정보). 비공개, 없는 박람회는 404.
    @GetMapping("/{expoId}")
    public ResponseEntity<ApiResponse<ExpoSummaryResponse>> getPublicExpo(@PathVariable Long expoId) {

        return ResponseEntity.ok(ApiResponse.success(expoService.getPublicExpo(expoId)));
    }

    // 참가 확정 부스 목록 + 배너
    @GetMapping("/{expoId}/booths")
    public ResponseEntity<ApiResponse<ExpoBoothsResponse>> getPublicExpoBooths(@PathVariable Long expoId) {

        return ResponseEntity.ok(ApiResponse.success(expoService.getExpoBooths(expoId, BoothStatus.ASSIGNED)));
    }

    // 부스 소개글 목록 (참가 확정 부스만)
    @GetMapping("/{expoId}/posts")
    public ResponseEntity<ApiResponse<List<BoothContentResponse>>> getPublicExpoPosts(@PathVariable Long expoId) {

        return ResponseEntity.ok(ApiResponse.success(expoService.getPublicExpoPosts(expoId)));
    }
}
