package com.team4.review.dto;

import com.team4.review.domain.ReviewImage;
import lombok.Getter;

@Getter
public class ReviewImageResponse {

    private final Long imageId;
    private final String imageUrl;

    private ReviewImageResponse(Long imageId, String imageUrl) {
        this.imageId = imageId;
        this.imageUrl = imageUrl;
    }

    public static ReviewImageResponse from(ReviewImage image) {
        return new ReviewImageResponse(image.getId(), image.getImageUrl());
    }
}
