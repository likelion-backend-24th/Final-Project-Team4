package com.team4.review.controller;

import com.team4.common.response.ApiResponse;
import com.team4.review.dto.ExhibitorReviewResponse;
import com.team4.common.security.GatewayUser;
import com.team4.review.service.ReviewService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// 참가업체가 본인 부스로 들어온 후기를 실명으로 조회(EXHIBITOR 롤만, SecurityConfig).
@RestController
@RequestMapping("/api/exhibitor/booths/{boothId}/reviews")
public class ReviewExhibitorController {

    private final ReviewService reviewService;

    public ReviewExhibitorController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ExhibitorReviewResponse>>> listReviews(
            @AuthenticationPrincipal GatewayUser exhibitor,
            @PathVariable Long boothId) {

        return ResponseEntity.ok(ApiResponse.success(reviewService.listForExhibitor(exhibitor.getId(), boothId)));
    }
}
