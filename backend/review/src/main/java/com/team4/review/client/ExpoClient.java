package com.team4.review.client;

public interface ExpoClient {
    // 후기 작성 자격 확인(reviewType별로 기준 다름) + 표시용 boothNo 조회. 부스가 없으면 CustomException(NOT_FOUND).
    BoothReviewEligibility checkReviewEligibility(Long boothId, Long customerId, String reviewType);

    // 참가업체 후기 조회 전 본인 부스(참가 확정) 소유 여부 확인.
    boolean isBoothOwnedByExhibitor(Long boothId, Long exhibitorId);
}
