package com.team4.expo.dto;

import com.team4.expo.domain.Review;
import java.time.LocalDateTime;
import lombok.Getter;

@Getter
public class ReviewResponse {

    private final Long reviewId;
    private final String boothNo;
    private final String vehicleName;
    private final String customerName;
    private final String content;
    private final LocalDateTime createdAt;

    private ReviewResponse(Long reviewId, String boothNo, String vehicleName, String customerName,
                            String content, LocalDateTime createdAt) {
        this.reviewId = reviewId;
        this.boothNo = boothNo;
        this.vehicleName = vehicleName;
        this.customerName = customerName;
        this.content = content;
        this.createdAt = createdAt;
    }

    public static ReviewResponse from(Review review) {
        return new ReviewResponse(
                review.getId(),
                review.getBooth().getBoothNo(),
                review.getVehicleName(),
                mask(review.getCustomerName()),
                review.getContent(),
                review.getCreatedAt()
        );
    }

    // 마이페이지 등 다른 화면과 동일하게 실명은 저장만 하고 화면에는 "김○○" 식으로 앞 글자만 노출
    private static String mask(String name) {
        if (name == null || name.isBlank()) {
            return "익명";
        }
        return name.charAt(0) + "○○";
    }
}
