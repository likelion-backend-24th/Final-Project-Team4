package com.team4.expo.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.expo.domain.ApplicationStatus;
import com.team4.expo.domain.Booth;
import com.team4.expo.domain.BoothApplication;
import com.team4.expo.domain.BoothApplicationGroup;
import com.team4.expo.domain.BoothStatus;
import com.team4.expo.domain.Expo;
import com.team4.expo.domain.ExpoStatus;
import com.team4.expo.repository.BoothApplicationRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Component;

// 부스 참가 신청 관련 공용 검증 로직. BoothApplicationService 등 여러 서비스에서 재사용.
@Component
public class BoothApplicationValidator {

    private static final List<ApplicationStatus> ACTIVE_APPLICATION_STATUSES =
            List.of(ApplicationStatus.SUBMITTED, ApplicationStatus.PAYMENT_PENDING, ApplicationStatus.CONFIRMED);

    private final BoothApplicationRepository boothApplicationRepository;

    public BoothApplicationValidator(BoothApplicationRepository boothApplicationRepository) {
        this.boothApplicationRepository = boothApplicationRepository;
    }

    // 박람회가 공개 상태이고 지금이 신청 접수 기간인지 확인
    public void validateApplicationPeriod(Expo expo) {
        if (expo.getStatus() != ExpoStatus.OPEN) {
            throw new CustomException(ErrorCode.INVALID_STATE, "공개되지 않은 박람회입니다.");
        }
        if (!isWithinApplyPeriod(expo, LocalDateTime.now())) {
            throw new CustomException(ErrorCode.INVALID_STATE, "부스 참가 신청 기간이 아닙니다.");
        }
    }

    // 신청 가능 기간 내인지 (ExpoService의 부스 목록 applicable 계산에도 재사용)
    public boolean isWithinApplyPeriod(Expo expo, LocalDateTime now) {
        return !now.isBefore(expo.getApplyStartsAt()) && !now.isAfter(expo.getApplyEndsAt());
    }

    // 신청하려는 부스가 이 신청 그룹이 속한 박람회의 부스가 맞는지 확인 (다른 박람회 부스 섞임 방지)
    public void validateBoothBelongsToExpo(Booth booth, Expo expo) {
        if (!booth.getExpo().getId().equals(expo.getId())) {
            throw new CustomException(ErrorCode.NOT_FOUND, "부스를 찾을 수 없습니다.");
        }
    }

    // 신청 대상 부스 자리가 아직 확정 배정되지 않았는지 확인
    public void validateBoothAvailable(Booth booth) {
        if (booth.getStatus() != BoothStatus.AVAILABLE) {
            throw new CustomException(ErrorCode.INVALID_STATE, "신청 가능한 잔여 부스가 없습니다.");
        }
    }

    // 같은 업체가 같은 부스에 이미 진행 중인 신청을 넣었는지 확인
    public void validateNoDuplicateApplication(Long boothId, Long exhibitorId) {
        boolean exists = boothApplicationRepository.existsByBooth_IdAndExhibitorIdAndStatusIn(
                boothId, exhibitorId, ACTIVE_APPLICATION_STATUSES);

        if (exists) {
            throw new CustomException(ErrorCode.DUPLICATE, "이미 해당 부스에 참가 신청한 이력이 있습니다.");
        }
    }

    // 신청 그룹의 소유자가 요청자 본인인지 확인
    public void validateGroupOwnership(BoothApplicationGroup group, Long exhibitorId) {
        if (!group.getExhibitorId().equals(exhibitorId)) {
            throw new CustomException(ErrorCode.FORBIDDEN, "본인 신청 그룹이 아닙니다.");
        }
    }

    // 그룹 내 모든 부스 신청이 DRAFT 상태인지 확인 (수정·제출은 DRAFT에서만 가능)
    public void validateAllDraft(List<BoothApplication> applications) {
        boolean allDraft = applications.stream().allMatch(a -> a.getStatus() == ApplicationStatus.DRAFT);
        if (!allDraft) {
            throw new CustomException(ErrorCode.INVALID_STATE, "임시저장 상태의 신청만 처리할 수 있습니다.");
        }
    }
}
