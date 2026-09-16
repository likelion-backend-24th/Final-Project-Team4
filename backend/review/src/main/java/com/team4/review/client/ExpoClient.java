package com.team4.review.client;

public interface ExpoClient {
    // 후기 작성 자격(해당 부스 상담 COMPLETED) 확인 + 표시용 boothNo 조회. 부스가 없으면 CustomException(NOT_FOUND).
    BoothReviewEligibility checkReviewEligibility(Long boothId, Long customerId);
}
