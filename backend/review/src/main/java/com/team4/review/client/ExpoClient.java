package com.team4.review.client;

public interface ExpoClient {
    // 후기 작성 자격 확인(reviewType별로 기준 다름) + 표시용 boothNo 조회. 부스가 없으면 CustomException(NOT_FOUND).
    // consultationId: 상담후기(CONSULT)의 대상 상담 - 본인 소유·해당 부스·작성 가능(완료 후 5일 이내)인지 그 상담 기준으로 확인한다.
    BoothReviewEligibility checkReviewEligibility(Long boothId, Long customerId, String reviewType, Long consultationId);

    // 참가업체 후기 조회 전 본인 부스(참가 확정) 소유 여부 확인.
    boolean isBoothOwnedByExhibitor(Long boothId, Long exhibitorId);
}
