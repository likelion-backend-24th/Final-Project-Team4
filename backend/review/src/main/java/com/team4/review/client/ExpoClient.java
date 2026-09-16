package com.team4.review.client;

public interface ExpoClient {
    // 후기 작성 자격 확인(reviewType별로 기준 다름) + 표시용 boothNo 조회. 부스가 없으면 CustomException(NOT_FOUND).
    BoothReviewEligibility checkReviewEligibility(Long boothId, Long customerId, String reviewType);
}
