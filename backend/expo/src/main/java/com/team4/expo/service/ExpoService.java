package com.team4.expo.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.expo.domain.ApplicationStatus;
import com.team4.expo.domain.Booth;
import com.team4.expo.domain.BoothApplication;
import com.team4.expo.domain.BoothStatus;
import com.team4.expo.domain.Expo;
import com.team4.expo.domain.ExpoStatus;
import com.team4.expo.dto.*;
import com.team4.expo.repository.BoothApplicationRepository;
import com.team4.expo.repository.BoothRepository;
import com.team4.expo.repository.ExpoRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    // open 박람회 목록 페이징 조회
    @Transactional(readOnly = true)
    public Page<ExpoSummaryResponse> listOpenExpos(Pageable pageable){
        Page<Expo> openExpos = expoRepository.findByStatus(ExpoStatus.OPEN, pageable);

        return openExpos.map(ExpoSummaryResponse::from);
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