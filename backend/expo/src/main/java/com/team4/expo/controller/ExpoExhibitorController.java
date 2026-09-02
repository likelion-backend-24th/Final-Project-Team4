package com.team4.expo.controller;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.common.response.ApiResponse;
import com.team4.common.response.PageMeta;
import com.team4.expo.dto.BoothApplicationRequest;
import com.team4.expo.dto.BoothApplicationResponse;
import com.team4.expo.dto.ExpoSummaryResponse;
import com.team4.expo.service.ExpoService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/exhibitor")
public class ExpoExhibitorController {

    private final ExpoService expoService;

    public ExpoExhibitorController(ExpoService expoService) {
        this.expoService = expoService;
    }

    @PostMapping("/booth-applications")
    public ResponseEntity<ApiResponse<BoothApplicationResponse>> applyBooth(
            @RequestHeader("X-User-Id") Long exhibitorId,
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @Valid @RequestBody BoothApplicationRequest request) {

        requireExhibitor(role);

        BoothApplicationResponse response = expoService.applyBooth(exhibitorId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    // open 박람회 목록 페이징 조회
    @GetMapping("/expos")
    public ResponseEntity<ApiResponse<PageMeta<ExpoSummaryResponse>>> listOpenExpos(@RequestHeader(value = "X-User-Role", required = false) String role,
                                                                                    @PageableDefault(size = 10, sort = "applyEndsAt") Pageable pageable) {
        requireExhibitor(role);

        return ResponseEntity.ok(ApiResponse.success(PageMeta.from(expoService.listOpenExpos(pageable))));
    }

    private void requireExhibitor(String role) {
        if (!"EXHIBITOR".equals(role)) {
            throw new CustomException(ErrorCode.FORBIDDEN, "참가업체만 접근할 수 있습니다.");
        }
    }
}
