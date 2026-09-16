package com.team4.expo.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.expo.client.CustomerContact;
import com.team4.expo.client.IdentityClient;
import com.team4.expo.domain.Booth;
import com.team4.expo.domain.ConsultationStatus;
import com.team4.expo.domain.Review;
import com.team4.expo.domain.ReviewType;
import com.team4.expo.dto.ReviewListResponse;
import com.team4.expo.dto.ReviewRequest;
import com.team4.expo.dto.ReviewResponse;
import com.team4.expo.repository.BoothRepository;
import com.team4.expo.repository.ConsultationRepository;
import com.team4.expo.repository.ReviewRepository;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 부스 방문 후기(상담후기/부스후기) 작성·조회. 상담이 COMPLETED된 부스에만 후기를 남길 수 있다.
@Service
@Transactional
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final BoothRepository boothRepository;
    private final ConsultationRepository consultationRepository;
    private final IdentityClient identityClient;

    public ReviewService(ReviewRepository reviewRepository, BoothRepository boothRepository,
                          ConsultationRepository consultationRepository, IdentityClient identityClient) {
        this.reviewRepository = reviewRepository;
        this.boothRepository = boothRepository;
        this.consultationRepository = consultationRepository;
        this.identityClient = identityClient;
    }

    @Transactional(readOnly = true)
    public ReviewListResponse listReviews(Long boothId) {
        List<ReviewResponse> consultReviews =
                reviewRepository.findByBooth_IdAndReviewTypeOrderByCreatedAtDesc(boothId, ReviewType.CONSULT).stream()
                        .map(ReviewResponse::from)
                        .collect(Collectors.toList());
        List<ReviewResponse> boothReviews =
                reviewRepository.findByBooth_IdAndReviewTypeOrderByCreatedAtDesc(boothId, ReviewType.BOOTH).stream()
                        .map(ReviewResponse::from)
                        .collect(Collectors.toList());

        return new ReviewListResponse(reviewRepository.countByBooth_Id(boothId), consultReviews, boothReviews);
    }

    public ReviewResponse createReview(Long customerId, Long boothId, ReviewRequest request) {
        if (request.getReviewType() == ReviewType.CONSULT
                && (request.getVehicleName() == null || request.getVehicleName().isBlank())) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "상담후기는 차량명을 입력해야 합니다.");
        }

        Booth booth = boothRepository.findById(boothId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "부스를 찾을 수 없습니다."));

        boolean eligible = consultationRepository
                .existsByCustomerIdAndBooth_IdAndStatus(customerId, boothId, ConsultationStatus.COMPLETED);
        if (!eligible) {
            throw new CustomException(ErrorCode.INVALID_STATE, "상담이 완료된 참가업체에만 후기를 작성할 수 있습니다.");
        }

        String customerName = identityClient.getCustomerContact(customerId)
                .map(CustomerContact::name)
                .orElse("고객");

        Review review = new Review(booth, request.getReviewType(), customerId, customerName,
                request.getReviewType() == ReviewType.CONSULT ? request.getVehicleName() : null,
                request.getContent());

        return ReviewResponse.from(reviewRepository.save(review));
    }
}
