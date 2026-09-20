package com.team4.review.controller;

import com.team4.common.response.ApiResponse;
import com.team4.review.dto.ReviewImageResponse;
import com.team4.review.dto.ReviewListResponse;
import com.team4.review.dto.ReviewRequest;
import com.team4.review.dto.ReviewResponse;
import com.team4.review.security.GatewayUser;
import com.team4.review.service.ReviewService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
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

// 부스 방문 후기(상담후기/부스후기). 조회는 비회원도 가능(게이트웨이 화이트리스트), 작성은 USER 역할만(SecurityConfig).
@RestController
@RequestMapping("/api/customer/booths/{boothId}/reviews")
public class ReviewCustomerController {

    private final ReviewService reviewService;

    public ReviewCustomerController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<ReviewListResponse>> listReviews(@PathVariable Long boothId) {
        return ResponseEntity.ok(ApiResponse.success(reviewService.listReviews(boothId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ReviewResponse>> createReview(
            @AuthenticationPrincipal GatewayUser customer,
            @PathVariable Long boothId,
            @Valid @RequestBody ReviewRequest request) {

        ReviewResponse response = reviewService.createReview(customer.getId(), boothId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @PutMapping("/{reviewId}")
    public ResponseEntity<ApiResponse<ReviewResponse>> updateReview(
            @AuthenticationPrincipal GatewayUser customer,
            @PathVariable Long boothId,
            @PathVariable Long reviewId,
            @Valid @RequestBody ReviewRequest request) {

        return ResponseEntity.ok(ApiResponse.success(reviewService.updateReview(customer.getId(), boothId, reviewId, request)));
    }

    @DeleteMapping("/{reviewId}")
    public ResponseEntity<Void> deleteReview(
            @AuthenticationPrincipal GatewayUser customer,
            @PathVariable Long boothId,
            @PathVariable Long reviewId) {

        reviewService.deleteReview(customer.getId(), boothId, reviewId);
        return ResponseEntity.noContent().build();
    }

    // 후기 사진 추가(최대 5장, 선택) - createReview로 후기를 먼저 만든 뒤 파일마다 호출.
    @PostMapping("/{reviewId}/images")
    public ResponseEntity<ApiResponse<ReviewImageResponse>> addReviewImage(
            @AuthenticationPrincipal GatewayUser customer,
            @PathVariable Long boothId,
            @PathVariable Long reviewId,
            @RequestParam("image") MultipartFile image) {

        ReviewImageResponse response = reviewService.addReviewImage(customer.getId(), boothId, reviewId, image);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }
}
