package com.team4.review.dto;

import com.team4.review.domain.Review;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Getter;

@Getter
public class ReviewResponse {

    private final Long reviewId;
    private final String boothNo;
    private final String vehicleName;
    private final String customerName;
    private final String content;
    private final LocalDateTime createdAt;
    private final List<ReviewImageResponse> images;

    private ReviewResponse(Long reviewId, String boothNo, String vehicleName, String customerName,
                            String content, LocalDateTime createdAt, List<ReviewImageResponse> images) {
        this.reviewId = reviewId;
        this.boothNo = boothNo;
        this.vehicleName = vehicleName;
        this.customerName = customerName;
        this.content = content;
        this.createdAt = createdAt;
        this.images = images;
    }

    public static ReviewResponse from(Review review, List<ReviewImageResponse> images) {
        return new ReviewResponse(
                review.getId(),
                review.getBoothNo(),
                review.getVehicleName(),
                mask(review.getCustomerName()),
                review.getContent(),
                review.getCreatedAt(),
                images
        );
    }

    // 실명은 저장만 하고 화면에는 "김○○" 식으로 앞 글자만 노출
    private static String mask(String name) {
        if (name == null || name.isBlank()) {
            return "익명";
        }
        return name.charAt(0) + "○○";
    }
}
