package com.team4.expo.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.expo.domain.ApplicationStatus;
import com.team4.expo.domain.Consultation;
import com.team4.expo.domain.ConsultationStatus;
import com.team4.expo.dto.ConsultationResponse;
import com.team4.expo.repository.BoothApplicationRepository;
import com.team4.expo.repository.ConsultationRepository;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 참가업체의 차량 상담 신청 조회·승인·반려 (TASK 6-3).
@Service
@Transactional
public class ConsultationReviewService {

    private final ConsultationRepository consultationRepository;
    private final BoothApplicationRepository boothApplicationRepository;

    public ConsultationReviewService(ConsultationRepository consultationRepository,
                                      BoothApplicationRepository boothApplicationRepository) {
        this.consultationRepository = consultationRepository;
        this.boothApplicationRepository = boothApplicationRepository;
    }

    @Transactional(readOnly = true)
    public List<ConsultationResponse> listForExhibitor(Long exhibitorId) {
        List<Long> ownedBoothIds = confirmedBoothIds(exhibitorId);
        if (ownedBoothIds.isEmpty()) {
            return List.of();
        }

        return consultationRepository.findByBooth_IdInOrderByCreatedAtDesc(ownedBoothIds).stream()
                .map(ConsultationResponse::from)
                .collect(Collectors.toList());
    }

    public ConsultationResponse approveConsultation(Long exhibitorId, Long consultationId) {
        Consultation consultation = findOwnedConsultation(exhibitorId, consultationId);

        if (consultation.getStatus() != ConsultationStatus.REQUESTED) {
            throw new CustomException(ErrorCode.INVALID_STATE, "접수 대기 상태의 신청만 승인할 수 있습니다.");
        }

        consultation.approve();
        return ConsultationResponse.from(consultation);
    }

    public ConsultationResponse rejectConsultation(Long exhibitorId, Long consultationId, String reason) {
        Consultation consultation = findOwnedConsultation(exhibitorId, consultationId);

        if (consultation.getStatus() != ConsultationStatus.REQUESTED) {
            throw new CustomException(ErrorCode.INVALID_STATE, "접수 대기 상태의 신청만 반려할 수 있습니다.");
        }

        consultation.reject(reason);
        return ConsultationResponse.from(consultation);
    }

    private Consultation findOwnedConsultation(Long exhibitorId, Long consultationId) {
        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "신청을 찾을 수 없습니다."));

        boolean owns = confirmedBoothIds(exhibitorId).contains(consultation.getBooth().getId());
        if (!owns) {
            throw new CustomException(ErrorCode.FORBIDDEN, "본인 부스로 들어온 신청만 처리할 수 있습니다.");
        }

        return consultation;
    }

    private List<Long> confirmedBoothIds(Long exhibitorId) {
        return boothApplicationRepository.findByExhibitorIdAndStatus(exhibitorId, ApplicationStatus.CONFIRMED).stream()
                .map(application -> application.getBooth().getId())
                .collect(Collectors.toList());
    }
}
