package com.team4.review.dto;

import java.util.List;
import lombok.Getter;

// 부스 후기 화면(상담후기/부스후기 탭)을 한 번에 그릴 수 있도록 두 타입을 함께 내려준다.
@Getter
public class ReviewListResponse {

    private final long totalCount;
    private final List<ReviewResponse> consultReviews;
    private final List<ReviewResponse> boothReviews;

    public ReviewListResponse(long totalCount, List<ReviewResponse> consultReviews, List<ReviewResponse> boothReviews) {
        this.totalCount = totalCount;
        this.consultReviews = consultReviews;
        this.boothReviews = boothReviews;
    }
}
