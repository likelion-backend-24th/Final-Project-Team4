package com.team4.expo.expo.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.expo.expo.domain.Expo;
import com.team4.expo.expo.repository.ExpoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Set;
import java.util.UUID;

// 박람회 배너 이미지 등록/교체
@Service
@Transactional
public class ExpoContentService {

    private static final Set<String> ALLOWED_BANNER_IMAGE_TYPES = Set.of("image/png", "image/jpeg", "image/webp");
    private static final long MAX_BANNER_IMAGE_SIZE = 5 * 1024 * 1024;
    private static final Path BANNER_UPLOAD_DIR = Paths.get("uploads", "expo");

    private final ExpoRepository expoRepository;

    public ExpoContentService(ExpoRepository expoRepository) {
        this.expoRepository = expoRepository;
    }

    public String updateBannerImage(Long expoId, MultipartFile image) {
        Expo expo = expoRepository.findById(expoId).orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "박람회를 찾을 수 없습니다."));

        validateBannerImage(image);

        String bannerImageUrl = storeBannerImage(image);
        expo.updateBannerImage(bannerImageUrl);

        return bannerImageUrl;
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

            return "/uploads/expo/" + fileName;
        } catch (IOException e) {
            throw new CustomException(ErrorCode.INTERNAL_ERROR, "이미지 저장에 실패했습니다.");
        }
    }
}
