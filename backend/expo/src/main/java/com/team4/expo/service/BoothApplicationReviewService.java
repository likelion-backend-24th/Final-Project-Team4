package com.team4.expo.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.expo.domain.ApplicationStatus;
import com.team4.expo.domain.BoothApplication;
import com.team4.expo.dto.BoothApplicationDecisionResponse;
import com.team4.expo.repository.BoothApplicationRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// Admin의 부스 참가 신청 승인/반려 (TASK 2-1).
@Service
@Transactional
public class BoothApplicationReviewService {

    private static final List<ApplicationStatus> COMPETING_STATUSES =
            List.of(ApplicationStatus.PAYMENT_PENDING, ApplicationStatus.CONFIRMED);

    private final BoothApplicationRepository boothApplicationRepository;

    public BoothApplicationReviewService(BoothApplicationRepository boothApplicationRepository) {
        this.boothApplicationRepository = boothApplicationRepository;
    }

    // 부스 참가 신청 승인 (SUBMITTED -> PAYMENT_PENDING).
    // 같은 부스에 이미 승인 진행 중/확정된 다른 신청이 있으면 차단(2026-09-03 확정: 승자는 관리자가 승인 시점에 결정).
    public BoothApplicationDecisionResponse approveBoothApplication(Long applicationId) {
        BoothApplication application = boothApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "신청을 찾을 수 없습니다."));

        if (application.getStatus() != ApplicationStatus.SUBMITTED) {
            throw new CustomException(ErrorCode.INVALID_STATE, "심사 대기 상태의 신청만 승인할 수 있습니다.");
        }

        boolean competingExists = boothApplicationRepository.existsByBooth_IdAndStatusIn(
                application.getBooth().getId(), COMPETING_STATUSES);
        if (competingExists) {
            throw new CustomException(ErrorCode.INVALID_STATE, "이미 다른 신청이 같은 부스에 승인 진행 중이거나 확정되었습니다.");
        }

        application.approve();
        // 부스도 같이 잠가서(RESERVED) 결제 대기 중에 다른 업체가 신청하지 못하게 함
        application.getBooth().reserve();
        return BoothApplicationDecisionResponse.from(application);
    }

    // 부스 참가 신청 반려 (SUBMITTED -> REJECTED)
    public BoothApplicationDecisionResponse rejectBoothApplication(Long applicationId, String reason) {
        BoothApplication application = boothApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "신청을 찾을 수 없습니다."));

        if (application.getStatus() != ApplicationStatus.SUBMITTED) {
            throw new CustomException(ErrorCode.INVALID_STATE, "심사 대기 상태의 신청만 반려할 수 있습니다.");
        }

        application.reject(reason);
        return BoothApplicationDecisionResponse.from(application);
    }
}
