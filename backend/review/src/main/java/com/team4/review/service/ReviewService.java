package com.team4.review.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.review.client.BoothReviewEligibility;
import com.team4.review.client.ExpoClient;
import com.team4.review.client.IdentityClient;
import com.team4.review.domain.Review;
import com.team4.review.domain.ReviewImage;
import com.team4.review.domain.ReviewType;
import com.team4.review.dto.ReviewImageResponse;
import com.team4.review.dto.ReviewListResponse;
import com.team4.review.dto.ReviewRequest;
import com.team4.review.dto.ReviewResponse;
import com.team4.review.repository.ReviewImageRepository;
import com.team4.review.repository.ReviewRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

// 부스 방문 후기(상담후기/부스후기) 작성·조회. 상담이 COMPLETED된 부스에만 후기를 남길 수 있다(Expo 내부 API로 확인).
@Service
@Transactional
public class ReviewService {

    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of("image/png", "image/jpeg", "image/webp");
    private static final long MAX_IMAGE_SIZE = 10 * 1024 * 1024;
    private static final int MAX_IMAGES_PER_REVIEW = 5;
    private static final Path REVIEW_IMAGE_UPLOAD_DIR = Paths.get("uploads", "review");

    private final ReviewRepository reviewRepository;
    private final ReviewImageRepository reviewImageRepository;
    private final ExpoClient expoClient;
    private final IdentityClient identityClient;

    public ReviewService(ReviewRepository reviewRepository, ReviewImageRepository reviewImageRepository,
                          ExpoClient expoClient, IdentityClient identityClient) {
        this.reviewRepository = reviewRepository;
        this.reviewImageRepository = reviewImageRepository;
        this.expoClient = expoClient;
        this.identityClient = identityClient;
    }

    // 목록 조회는 이 서비스 DB만 읽는다 - boothNo가 작성 시점에 이미 저장돼 있어 Expo를 호출할 필요가 없다.
    @Transactional(readOnly = true)
    public ReviewListResponse listReviews(Long boothId) {
        List<Review> consultReviews = reviewRepository.findByBoothIdAndReviewTypeOrderByCreatedAtDesc(boothId, ReviewType.CONSULT);
        List<Review> boothReviews = reviewRepository.findByBoothIdAndReviewTypeOrderByCreatedAtDesc(boothId, ReviewType.BOOTH);

        List<Long> allIds = java.util.stream.Stream.concat(consultReviews.stream(), boothReviews.stream())
                .map(Review::getId).collect(Collectors.toList());
        Map<Long, List<ReviewImageResponse>> imagesByReviewId = allIds.isEmpty()
                ? Map.of()
                : reviewImageRepository.findByReview_IdInOrderByReview_IdAscSortOrderAsc(allIds).stream()
                        .collect(Collectors.groupingBy(img -> img.getReview().getId(),
                                Collectors.mapping(ReviewImageResponse::from, Collectors.toList())));

        return new ReviewListResponse(
                reviewRepository.countByBoothId(boothId),
                consultReviews.stream().map(r -> ReviewResponse.from(r, imagesByReviewId.getOrDefault(r.getId(), List.of()))).collect(Collectors.toList()),
                boothReviews.stream().map(r -> ReviewResponse.from(r, imagesByReviewId.getOrDefault(r.getId(), List.of()))).collect(Collectors.toList())
        );
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

        return ReviewResponse.from(reviewRepository.save(review), List.of());
    }

    // 후기 사진 추가(최대 5장, 선택) - 프론트가 createReview 이후 파일마다 이 API를 순차 호출한다(차량 이미지와 같은 2단계 패턴).
    public ReviewImageResponse addReviewImage(Long customerId, Long boothId, Long reviewId, MultipartFile image) {
        Review review = findOwnedReview(customerId, boothId, reviewId);
        validateImage(image);

        int existingCount = reviewImageRepository.countByReview_Id(reviewId);
        if (existingCount >= MAX_IMAGES_PER_REVIEW) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "후기 사진은 최대 " + MAX_IMAGES_PER_REVIEW + "장까지 등록할 수 있습니다.");
        }

        String imageUrl = storeImage(image);
        ReviewImage reviewImage = new ReviewImage(review, imageUrl, existingCount);
        reviewImageRepository.save(reviewImage);

        return ReviewImageResponse.from(reviewImage);
    }

    private Review findOwnedReview(Long customerId, Long boothId, Long reviewId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "후기를 찾을 수 없습니다."));
        if (!review.getCustomerId().equals(customerId) || !review.getBoothId().equals(boothId)) {
            throw new CustomException(ErrorCode.FORBIDDEN, "본인이 작성한 후기에만 사진을 추가할 수 있습니다.");
        }
        return review;
    }

    private void validateImage(MultipartFile image) {
        if (image == null || image.isEmpty()) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "이미지 파일이 필요합니다.");
        }
        if (!ALLOWED_IMAGE_TYPES.contains(image.getContentType())) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "PNG, JPEG, WEBP 형식의 이미지만 업로드할 수 있습니다.");
        }
        if (image.getSize() > MAX_IMAGE_SIZE) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "이미지 파일은 10MB를 초과할 수 없습니다.");
        }
    }

    private String storeImage(MultipartFile image) {
        try {
            Files.createDirectories(REVIEW_IMAGE_UPLOAD_DIR);

            String extension = StringUtils.getFilenameExtension(image.getOriginalFilename());
            String fileName = UUID.randomUUID() + "." + extension;
            Path target = REVIEW_IMAGE_UPLOAD_DIR.resolve(fileName);
            image.transferTo(target);

            return "/uploads/review/" + fileName;
        } catch (IOException e) {
            throw new CustomException(ErrorCode.INTERNAL_ERROR, "이미지 저장에 실패했습니다.");
        }
    }
}
