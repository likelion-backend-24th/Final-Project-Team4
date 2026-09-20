package com.team4.review.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.review.client.BoothReviewEligibility;
import com.team4.review.client.ExpoClient;
import com.team4.review.client.IdentityClient;
import com.team4.review.domain.Review;
import com.team4.review.domain.ReviewImage;
import com.team4.review.domain.ReviewType;
import com.team4.review.dto.ExhibitorReviewResponse;
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
import org.springframework.dao.DataIntegrityViolationException;
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

    // 참가업체가 본인 부스로 들어온 후기를 실명으로 조회(2026-09-16 확정) - 소유권은 Expo 내부 API로 확인.
    @Transactional(readOnly = true)
    public List<ExhibitorReviewResponse> listForExhibitor(Long exhibitorId, Long boothId) {
        if (!expoClient.isBoothOwnedByExhibitor(boothId, exhibitorId)) {
            throw new CustomException(ErrorCode.FORBIDDEN, "본인 부스의 후기만 조회할 수 있습니다.");
        }

        List<Review> reviews = reviewRepository.findByBoothIdOrderByCreatedAtDesc(boothId);
        List<Long> reviewIds = reviews.stream().map(Review::getId).collect(Collectors.toList());
        Map<Long, List<ReviewImageResponse>> imagesByReviewId = reviewIds.isEmpty()
                ? Map.of()
                : reviewImageRepository.findByReview_IdInOrderByReview_IdAscSortOrderAsc(reviewIds).stream()
                        .collect(Collectors.groupingBy(img -> img.getReview().getId(),
                                Collectors.mapping(ReviewImageResponse::from, Collectors.toList())));

        return reviews.stream()
                .map(r -> ExhibitorReviewResponse.from(r, imagesByReviewId.getOrDefault(r.getId(), List.of())))
                .collect(Collectors.toList());
    }

    public ReviewResponse createReview(Long customerId, Long boothId, ReviewRequest request) {
        if (request.getReviewType() == ReviewType.CONSULT
                && (request.getVehicleName() == null || request.getVehicleName().isBlank())) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "상담후기는 차량명을 입력해야 합니다.");
        }

        if (request.getReviewType() == ReviewType.CONSULT && request.getConsultationId() == null) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "상담후기는 대상 상담을 지정해야 합니다.");
        }
        // 상담후기는 상담 1건당 1개, 부스후기는 고객·부스당 1개 - 삭제하면 다시 작성할 수 있다.
        boolean alreadyWritten = request.getReviewType() == ReviewType.CONSULT
                ? reviewRepository.existsByConsultationId(request.getConsultationId())
                : reviewRepository.existsByCustomerIdAndBoothIdAndReviewType(customerId, boothId, ReviewType.BOOTH);
        if (alreadyWritten) {
            throw new CustomException(ErrorCode.DUPLICATE, request.getReviewType() == ReviewType.CONSULT
                    ? "이미 이 상담에 대한 후기를 작성했습니다." : "이미 이 부스에 대한 부스후기를 작성했습니다.");
        }

        Long consultationId = request.getReviewType() == ReviewType.CONSULT ? request.getConsultationId() : null;
        BoothReviewEligibility eligibility = expoClient.checkReviewEligibility(boothId, customerId, request.getReviewType().name(), consultationId);
        if (!eligibility.eligible()) {
            throw new CustomException(ErrorCode.INVALID_STATE, "상담이 완료된 참가업체에만 후기를 작성할 수 있습니다.");
        }

        String customerName = identityClient.getCustomerName(customerId).orElse("고객");

        Review review = new Review(boothId, eligibility.boothNo(), request.getReviewType(), customerId, customerName,
                request.getReviewType() == ReviewType.CONSULT ? request.getVehicleName() : null,
                consultationId, request.getContent());

        // 같은 상담에 동시에 두 번 요청이 들어와도 DB 유니크 인덱스(consultation_id)가 막는다.
        try {
            return ReviewResponse.from(reviewRepository.saveAndFlush(review), List.of());
        } catch (DataIntegrityViolationException e) {
            throw new CustomException(ErrorCode.DUPLICATE, "이미 이 상담에 대한 후기를 작성했습니다.");
        }
    }

    // 마이페이지 "내가 쓴 후기" - 부스 ID/후기 유형을 같이 내려줘서 프론트가 업체명(내 상담 내역과 boothId로 매칭)과 함께 보여준다.
    @Transactional(readOnly = true)
    public List<ReviewResponse> listMyReviews(Long customerId) {
        List<Review> reviews = reviewRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);
        List<Long> reviewIds = reviews.stream().map(Review::getId).collect(Collectors.toList());
        Map<Long, List<ReviewImageResponse>> imagesByReviewId = reviewIds.isEmpty()
                ? Map.of()
                : reviewImageRepository.findByReview_IdInOrderByReview_IdAscSortOrderAsc(reviewIds).stream()
                        .collect(Collectors.groupingBy(img -> img.getReview().getId(),
                                Collectors.mapping(ReviewImageResponse::from, Collectors.toList())));

        return reviews.stream()
                .map(r -> ReviewResponse.from(r, imagesByReviewId.getOrDefault(r.getId(), List.of())))
                .collect(Collectors.toList());
    }

    // 본인 후기 수정 - 유형(상담/부스)은 바꿀 수 없고 내용과 상담후기의 차량명만 바꾼다. 사진은 수정 대상이 아니다.
    public ReviewResponse updateReview(Long customerId, Long boothId, Long reviewId, ReviewRequest request) {
        Review review = findOwnedReview(customerId, boothId, reviewId);
        if (request.getReviewType() != review.getReviewType()) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "후기 유형은 변경할 수 없습니다.");
        }
        if (review.getReviewType() == ReviewType.CONSULT
                && (request.getVehicleName() == null || request.getVehicleName().isBlank())) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "상담후기는 차량명을 입력해야 합니다.");
        }

        review.update(review.getReviewType() == ReviewType.CONSULT ? request.getVehicleName() : null, request.getContent());

        List<ReviewImageResponse> images = reviewImageRepository.findByReview_IdOrderBySortOrderAsc(reviewId).stream()
                .map(ReviewImageResponse::from).collect(Collectors.toList());
        return ReviewResponse.from(review, images);
    }

    // 본인 후기 삭제 - 사진 행과 저장된 파일까지 같이 지운다(파일 삭제 실패는 후기 삭제를 막지 않는다).
    public void deleteReview(Long customerId, Long boothId, Long reviewId) {
        Review review = findOwnedReview(customerId, boothId, reviewId);
        List<ReviewImage> images = reviewImageRepository.findByReview_IdOrderBySortOrderAsc(reviewId);

        reviewImageRepository.deleteByReview_Id(reviewId);
        reviewRepository.delete(review);

        images.forEach(img -> {
            try {
                Files.deleteIfExists(REVIEW_IMAGE_UPLOAD_DIR.resolve(Paths.get(img.getImageUrl()).getFileName()));
            } catch (IOException ignored) {
                // 고아 파일이 남을 뿐 DB 정합성에는 영향 없음
            }
        });
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
            throw new CustomException(ErrorCode.FORBIDDEN, "본인이 작성한 후기만 처리할 수 있습니다.");
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
