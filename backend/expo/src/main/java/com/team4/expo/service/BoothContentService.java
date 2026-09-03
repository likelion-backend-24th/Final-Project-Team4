package com.team4.expo.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.expo.domain.ApplicationStatus;
import com.team4.expo.domain.Booth;
import com.team4.expo.domain.Post;
import com.team4.expo.dto.BoothContentRequest;
import com.team4.expo.dto.BoothContentResponse;
import com.team4.expo.repository.BoothApplicationRepository;
import com.team4.expo.repository.BoothRepository;
import com.team4.expo.repository.PostRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional
public class BoothContentService {

    private static final List<ApplicationStatus> CONFIRMED_STATUS_ONLY =
            List.of(ApplicationStatus.CONFIRMED);
    private static final Set<String> ALLOWED_BANNER_IMAGE_TYPES =
            Set.of("image/png", "image/jpeg", "image/webp");
    private static final long MAX_BANNER_IMAGE_SIZE = 5 * 1024 * 1024;
    private static final Path BANNER_UPLOAD_DIR = Paths.get("uploads", "banner");

    private final BoothRepository boothRepository;
    private final BoothApplicationRepository boothApplicationRepository;
    private final PostRepository postRepository;

    public BoothContentService(BoothRepository boothRepository,
                                BoothApplicationRepository boothApplicationRepository,
                                PostRepository postRepository) {
        this.boothRepository = boothRepository;
        this.boothApplicationRepository = boothApplicationRepository;
        this.postRepository = postRepository;
    }

    public BoothContentResponse registerOrUpdateContent(Long exhibitorId, Long boothId, BoothContentRequest request) {
        Booth booth = boothRepository.findById(boothId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND));

        validateBoothOwnershipConfirmed(boothId, exhibitorId);

        Post post = postRepository.findByBooth_Id(boothId).orElse(null);

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
}
