package com.team4.review.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.review.client.BoothReviewEligibility;
import com.team4.review.client.ExpoClient;
import com.team4.review.client.IdentityClient;
import com.team4.review.domain.Review;
import com.team4.review.domain.ReviewType;
import com.team4.review.dto.ReviewListResponse;
import com.team4.review.dto.ReviewRequest;
import com.team4.review.dto.ReviewResponse;
import com.team4.review.repository.ReviewRepository;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 부스 방문 후기(상담후기/부스후기) 작성·조회. 상담이 COMPLETED된 부스에만 후기를 남길 수 있다(Expo 내부 API로 확인).
@Service
@Transactional
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ExpoClient expoClient;
    private final IdentityClient identityClient;

    public ReviewService(ReviewRepository reviewRepository, ExpoClient expoClient, IdentityClient identityClient) {
        this.reviewRepository = reviewRepository;
        this.expoClient = expoClient;
        this.identityClient = identityClient;
    }

    // 목록 조회는 이 서비스 DB만 읽는다 - boothNo가 작성 시점에 이미 저장돼 있어 Expo를 호출할 필요가 없다.
    @Transactional(readOnly = true)
    public ReviewListResponse listReviews(Long boothId) {
        List<ReviewResponse> consultReviews =
                reviewRepository.findByBoothIdAndReviewTypeOrderByCreatedAtDesc(boothId, ReviewType.CONSULT).stream()
                        .map(ReviewResponse::from)
                        .collect(Collectors.toList());
        List<ReviewResponse> boothReviews =
                reviewRepository.findByBoothIdAndReviewTypeOrderByCreatedAtDesc(boothId, ReviewType.BOOTH).stream()
                        .map(ReviewResponse::from)
                        .collect(Collectors.toList());

        return new ReviewListResponse(reviewRepository.countByBoothId(boothId), consultReviews, boothReviews);
    }

    public ReviewResponse createReview(Long customerId, Long boothId, ReviewRequest request) {
        if (request.getReviewType() == ReviewType.CONSULT
                && (request.getVehicleName() == null || request.getVehicleName().isBlank())) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "상담후기는 차량명을 입력해야 합니다.");
        }

        BoothReviewEligibility eligibility = expoClient.checkReviewEligibility(boothId, customerId);
        if (!eligibility.eligible()) {
            throw new CustomException(ErrorCode.INVALID_STATE, "상담이 완료된 참가업체에만 후기를 작성할 수 있습니다.");
        }

        String customerName = identityClient.getCustomerName(customerId).orElse("고객");

        Review review = new Review(boothId, eligibility.boothNo(), request.getReviewType(), customerId, customerName,
                request.getReviewType() == ReviewType.CONSULT ? request.getVehicleName() : null,
                request.getContent());

        return ReviewResponse.from(reviewRepository.save(review));
    }
}
