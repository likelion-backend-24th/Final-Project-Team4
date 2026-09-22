package com.team4.review.controller;

import com.team4.common.response.ApiResponse;
import com.team4.review.dto.ReviewResponse;
import com.team4.common.security.GatewayUser;
import com.team4.review.service.ReviewService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// 마이페이지 - 내가 작성한 후기 목록(USER 롤만, SecurityConfig).
@RestController
@RequestMapping("/api/customer/reviews")
public class ReviewMyController {

    private final ReviewService reviewService;

    public ReviewMyController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @GetMapping("/mine")
    public ResponseEntity<ApiResponse<List<ReviewResponse>>> listMyReviews(@AuthenticationPrincipal GatewayUser customer) {
        return ResponseEntity.ok(ApiResponse.success(reviewService.listMyReviews(customer.getId())));
    }
}
