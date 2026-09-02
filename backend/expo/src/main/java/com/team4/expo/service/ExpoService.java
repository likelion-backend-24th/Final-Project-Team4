package com.team4.expo.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.expo.domain.ApplicationStatus;
import com.team4.expo.domain.Booth;
import com.team4.expo.domain.BoothApplication;
import com.team4.expo.domain.BoothStatus;
import com.team4.expo.domain.Expo;
import com.team4.expo.domain.ExpoStatus;
import com.team4.expo.dto.BoothApplicationRequest;
import com.team4.expo.dto.BoothApplicationResponse;
import com.team4.expo.dto.BoothRegisterRequest;
import com.team4.expo.dto.ExpoRegisterRequest;
import com.team4.expo.dto.ExpoResponse;
import com.team4.expo.repository.BoothApplicationRepository;
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
    private static final List<ApplicationStatus> ACTIVE_APPLICATION_STATUSES =
            List.of(ApplicationStatus.SUBMITTED, ApplicationStatus.PAYMENT_PENDING, ApplicationStatus.CONFIRMED);

    private final ExpoRepository expoRepository;
    private final BoothRepository boothRepository;
    private final BoothApplicationRepository boothApplicationRepository;

    public ExpoService(ExpoRepository expoRepository, BoothRepository boothRepository,
                        BoothApplicationRepository boothApplicationRepository) {
        this.expoRepository = expoRepository;
        this.boothRepository = boothRepository;
        this.boothApplicationRepository = boothApplicationRepository;
    }

    // 박람회와 부스 목록을 등록 (관리자용, 등록 직후엔 비공개 DRAFT 상태).
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

    // 등록된 박람회를 공개로 변경 (DRAFT -> OPEN, 공개되어야 참가업체가 신청 가능).
    public ExpoResponse openExpo(Long expoId) {
        Expo expo = expoRepository.findById(expoId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND));

        if (expo.getStatus() != ExpoStatus.DRAFT) {
            throw new CustomException(ErrorCode.INVALID_STATE);
        }

        expo.open();

        return new ExpoResponse(expo.getId(), expo.getStatus(), null);
    }

    // 참가업체가 특정 부스 자리에 참가를 신청 (검증 통과 시 SUBMITTED 상태로 저장).
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
                request.getExhibitionItem(),
                request.getConceptDescription(),
                request.isPowerRequested(),
                request.isWaterSupplyRequested(),
                request.isInternetRequested(),
                request.getAdditionalRequest()
        );
        boothApplicationRepository.save(application);

        return BoothApplicationResponse.from(application);
    }

    // 박람회가 공개 상태이고 지금이 신청 접수 기간인지 확인
    private void validateApplicationPeriod(Expo expo) {
        if (expo.getStatus() != ExpoStatus.OPEN) {
            throw new CustomException(ErrorCode.INVALID_STATE, "공개되지 않은 박람회입니다.");
        }

        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(expo.getApplyStartsAt()) || now.isAfter(expo.getApplyEndsAt())) {
            throw new CustomException(ErrorCode.INVALID_STATE, "부스 참가 신청 기간이 아닙니다.");
        }
    }

    // 신청 대상 부스 자리가 아직 확정 배정되지 않았는지 확인
    private void validateBoothAvailable(Booth booth) {
        if (booth.getStatus() != BoothStatus.AVAILABLE) {
            throw new CustomException(ErrorCode.INVALID_STATE, "신청 가능한 잔여 부스가 없습니다.");
        }
    }

    // 같은 업체가 같은 부스에 이미 진행 중인 신청을 넣었는지 확인
    private void validateNoDuplicateApplication(Long boothId, Long exhibitorId) {
        boolean exists = boothApplicationRepository.existsByBooth_IdAndExhibitorIdAndStatusIn(
                boothId, exhibitorId, ACTIVE_APPLICATION_STATUSES);

        if (exists) {
            throw new CustomException(ErrorCode.DUPLICATE, "이미 해당 부스에 참가 신청한 이력이 있습니다.");
        }
    }

    // 신청기간 <= 행사시작 < 행사종료 순서로 날짜가 맞는지 확인
    private void validateDateOrder(ExpoRegisterRequest request) {
        boolean valid = request.getApplyStartsAt().isBefore(request.getApplyEndsAt())
                && !request.getApplyEndsAt().isAfter(request.getStartsAt())
                && request.getStartsAt().isBefore(request.getEndsAt());

        if (!valid) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "일자 순서가 올바르지 않습니다.");
        }
    }

    // 같은 박람회 안에서 부스 번호(boothNo)가 겹치지 않는지 확인
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