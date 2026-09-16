package com.team4.review.dto;

import com.team4.review.domain.Review;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Getter;

// 참가업체가 보는 본인 부스 후기 - 고객 마스킹 없이 실명 그대로 노출(2026-09-16 확정, 업무상 필요).
@Getter
public class ExhibitorReviewResponse {

    private final Long reviewId;
    private final String reviewType;
    private final String vehicleName;
    private final String customerName;
    private final String content;
    private final LocalDateTime createdAt;
    private final List<ReviewImageResponse> images;

    private ExhibitorReviewResponse(Long reviewId, String reviewType, String vehicleName, String customerName,
                                     String content, LocalDateTime createdAt, List<ReviewImageResponse> images) {
        this.reviewId = reviewId;
        this.reviewType = reviewType;
        this.vehicleName = vehicleName;
        this.customerName = customerName;
        this.content = content;
        this.createdAt = createdAt;
        this.images = images;
    }

    public static ExhibitorReviewResponse from(Review review, List<ReviewImageResponse> images) {
        return new ExhibitorReviewResponse(
                review.getId(),
                review.getReviewType().name(),
                review.getVehicleName(),
                review.getCustomerName(),
                review.getContent(),
                review.getCreatedAt(),
                images
        );
    }
}
