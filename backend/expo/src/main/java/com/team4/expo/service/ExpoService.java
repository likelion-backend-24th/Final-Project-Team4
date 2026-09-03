package com.team4.expo.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.expo.domain.ApplicationStatus;
import com.team4.expo.domain.Booth;
import com.team4.expo.domain.BoothApplication;
import com.team4.expo.domain.BoothStatus;
import com.team4.expo.domain.Expo;
import com.team4.expo.domain.ExpoStatus;
import com.team4.expo.domain.Post;
import com.team4.expo.dto.BoothApplicationRequest;
import com.team4.expo.dto.BoothApplicationResponse;
import com.team4.expo.dto.BoothContentRequest;
import com.team4.expo.dto.BoothContentResponse;
import com.team4.expo.dto.BoothRegisterRequest;
import com.team4.expo.dto.ExpoRegisterRequest;
import com.team4.expo.dto.ExpoResponse;
import com.team4.expo.repository.BoothApplicationRepository;
import com.team4.expo.repository.BoothRepository;
import com.team4.expo.repository.ExpoRepository;
import com.team4.expo.repository.PostRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class ExpoService {

    private static final List<ApplicationStatus> ACTIVE_APPLICATION_STATUSES =
            List.of(ApplicationStatus.SUBMITTED, ApplicationStatus.PAYMENT_PENDING, ApplicationStatus.CONFIRMED);
    private static final List<ApplicationStatus> CONFIRMED_STATUS_ONLY =
            List.of(ApplicationStatus.CONFIRMED);
    private static final Set<String> ALLOWED_BANNER_IMAGE_TYPES =
            Set.of("image/png", "image/jpeg", "image/webp");
    private static final long MAX_BANNER_IMAGE_SIZE = 5 * 1024 * 1024;
    private static final Path BANNER_UPLOAD_DIR = Paths.get("uploads", "banner");

    private final ExpoRepository expoRepository;
    private final BoothRepository boothRepository;
    private final BoothApplicationRepository boothApplicationRepository;
    private final PostRepository postRepository;

    public ExpoService(ExpoRepository expoRepository, BoothRepository boothRepository,
                        BoothApplicationRepository boothApplicationRepository,
                        PostRepository postRepository) {
        this.expoRepository = expoRepository;
        this.boothRepository = boothRepository;
        this.boothApplicationRepository = boothApplicationRepository;
        this.postRepository = postRepository;
    }

    public ExpoResponse registerExpo(ExpoRegisterRequest request) {
        validateDateOrder(request);
        validateNoDuplicateBoothNo(request.getBooths());

        Expo expo = new Expo(
                request.getTitle(),
                request.getVenue(),
                request.getStartsAt(),
                request.getEndsAt(),
                request.getApplyStartsAt(),
                request.getApplyEndsAt()
        );
        expoRepository.save(expo);

        List<Booth> booths = request.getBooths().stream()
                .map(b -> new Booth(expo, b.getBoothNo(), b.getType(), b.getFee()))
                .collect(Collectors.toList());
        boothRepository.saveAll(booths);

        return new ExpoResponse(expo.getId(), expo.getStatus(), booths.size());
    }

    public ExpoResponse openExpo(Long expoId) {
        Expo expo = expoRepository.findById(expoId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND));

        if (expo.getStatus() != ExpoStatus.DRAFT) {
            throw new CustomException(ErrorCode.INVALID_STATE);
        }

        expo.open();

        return new ExpoResponse(expo.getId(), expo.getStatus(), null);
    }

    public BoothApplicationResponse applyBooth(Long exhibitorId, BoothApplicationRequest request) {
        Booth booth = boothRepository.findById(request.getBoothId())
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND));
        Expo expo = booth.getExpo();

        validateApplicationPeriod(expo);
        validateBoothAvailable(booth);
        validateNoDuplicateApplication(booth.getId(), exhibitorId);

        BoothApplication application = new BoothApplication(
                booth,
                exhibitorId,
                request.getCompanyInfo().getCompanyName(),
                request.getCompanyInfo().getManagerName(),
                request.getCompanyInfo().getContact(),
                request.getCompanyInfo().getIntro()
        );
        boothApplicationRepository.save(application);

        return BoothApplicationResponse.from(application);
    }

    public BoothContentResponse registerOrUpdateBoothContent(Long exhibitorId, Long boothId, BoothContentRequest request) {
        Booth booth = boothRepository.findById(boothId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND));

        validateBoothOwnershipConfirmed(boothId, exhibitorId);

        Post post = postRepository.findByBooth_Id(boothId)
                .orElse(null);

        if (post == null) {
            post = new Post(booth, request.getTitle(), request.getContent());
        } else {
            post.update(request.getTitle(), request.getContent());
        }
        postRepository.save(post);

        return BoothContentResponse.from(post);
    }

    public String updateBannerImage(Long exhibitorId, Long boothId, MultipartFile image) {
        Booth booth = boothRepository.findById(boothId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND));

        validateBoothOwnershipConfirmed(boothId, exhibitorId);
        validateBannerImage(image);

        String bannerImageUrl = storeBannerImage(image);
        booth.updateBannerImage(bannerImageUrl);

        return bannerImageUrl;
    }

    private void validateBoothOwnershipConfirmed(Long boothId, Long exhibitorId) {
        boolean confirmed = boothApplicationRepository.existsByBooth_IdAndExhibitorIdAndStatusIn(
                boothId, exhibitorId, CONFIRMED_STATUS_ONLY);

        if (!confirmed) {
            throw new CustomException(ErrorCode.FORBIDDEN, "참가 확정된 담당 부스만 관리할 수 있습니다.");
        }
    }

    private void validateBannerImage(MultipartFile image) {
        if (image == null || image.isEmpty()) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "이미지 파일이 필요합니다.");
        }
        if (!ALLOWED_BANNER_IMAGE_TYPES.contains(image.getContentType())) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "PNG, JPEG, WEBP 형식의 이미지만 업로드할 수 있습니다.");
        }
        if (image.getSize() > MAX_BANNER_IMAGE_SIZE) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "이미지 파일은 5MB를 초과할 수 없습니다.");
        }
    }

    private String storeBannerImage(MultipartFile image) {
        try {
            Files.createDirectories(BANNER_UPLOAD_DIR);

            String extension = StringUtils.getFilenameExtension(image.getOriginalFilename());
            String fileName = UUID.randomUUID() + "." + extension;
            Path target = BANNER_UPLOAD_DIR.resolve(fileName);
            image.transferTo(target);

            return "/uploads/banner/" + fileName;
        } catch (IOException e) {
            throw new CustomException(ErrorCode.INTERNAL_ERROR, "이미지 저장에 실패했습니다.");
        }
    }

    private void validateApplicationPeriod(Expo expo) {
        if (expo.getStatus() != ExpoStatus.OPEN) {
            throw new CustomException(ErrorCode.INVALID_STATE, "공개되지 않은 박람회입니다.");
        }

        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(expo.getApplyStartsAt()) || now.isAfter(expo.getApplyEndsAt())) {
            throw new CustomException(ErrorCode.INVALID_STATE, "부스 참가 신청 기간이 아닙니다.");
        }
    }

    private void validateBoothAvailable(Booth booth) {
        if (booth.getStatus() != BoothStatus.AVAILABLE) {
            throw new CustomException(ErrorCode.INVALID_STATE, "신청 가능한 잔여 부스가 없습니다.");
        }
    }

    private void validateNoDuplicateApplication(Long boothId, Long exhibitorId) {
        boolean exists = boothApplicationRepository.existsByBooth_IdAndExhibitorIdAndStatusIn(
                boothId, exhibitorId, ACTIVE_APPLICATION_STATUSES);

        if (exists) {
            throw new CustomException(ErrorCode.DUPLICATE, "이미 해당 부스에 참가 신청한 이력이 있습니다.");
        }
    }

    private void validateDateOrder(ExpoRegisterRequest request) {
        boolean valid = request.getApplyStartsAt().isBefore(request.getApplyEndsAt())
                && !request.getApplyEndsAt().isAfter(request.getStartsAt())
                && request.getStartsAt().isBefore(request.getEndsAt());

        if (!valid) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "일자 순서가 올바르지 않습니다.");
        }
    }

    private void validateNoDuplicateBoothNo(List<BoothRegisterRequest> booths) {
        long distinctCount = booths.stream()
                .map(BoothRegisterRequest::getBoothNo)
                .distinct()
                .count();

        if (distinctCount != booths.size()) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "부스 번호가 중복되었습니다.");
        }
    }
}