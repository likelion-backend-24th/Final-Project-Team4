package com.team4.expo.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.expo.domain.Booth;
import com.team4.expo.domain.BoothStatus;
import com.team4.expo.domain.Expo;
import com.team4.expo.domain.ExpoStatus;
import com.team4.expo.dto.BoothRegisterRequest;
import com.team4.expo.dto.ExpoRegisterRequest;
import com.team4.expo.dto.ExpoResponse;
import com.team4.expo.repository.BoothRepository;
import com.team4.expo.repository.ExpoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class ExpoService {

    private final ExpoRepository expoRepository;
    private final BoothRepository boothRepository;

    public ExpoService(ExpoRepository expoRepository, BoothRepository boothRepository) {
        this.expoRepository = expoRepository;
        this.boothRepository = boothRepository;
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