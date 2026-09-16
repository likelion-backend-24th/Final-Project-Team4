package com.team4.expo.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.expo.client.AiSummaryClient;
import com.team4.expo.domain.ApplicationStatus;
import com.team4.expo.domain.Booth;
import com.team4.expo.domain.Consultation;
import com.team4.expo.domain.ConsultationStatus;
import com.team4.expo.dto.BoothStatsResponse;
import com.team4.expo.dto.ConsultationResponse;
import com.team4.expo.repository.BoothApplicationRepository;
import com.team4.expo.repository.BoothRepository;
import com.team4.expo.repository.ConsultationRepository;
import com.team4.expo.repository.LeadRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 참가업체의 차량 상담 신청 조회·승인·반려 (TASK 6-3).
@Service
@Transactional
public class ConsultationReviewService {

    private final ConsultationRepository consultationRepository;
    private final BoothApplicationRepository boothApplicationRepository;
    private final BoothRepository boothRepository;
    private final LeadRepository leadRepository;
    private final AiSummaryClient aiSummaryClient;

    public ConsultationReviewService(ConsultationRepository consultationRepository,
                                      BoothApplicationRepository boothApplicationRepository,
                                      BoothRepository boothRepository, LeadRepository leadRepository,
                                      AiSummaryClient aiSummaryClient) {
        this.consultationRepository = consultationRepository;
        this.boothApplicationRepository = boothApplicationRepository;
        this.boothRepository = boothRepository;
        this.leadRepository = leadRepository;
        this.aiSummaryClient = aiSummaryClient;
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

    // 승인된 상담을 실제로 완료 처리. 방문 예정일 다음날부터만 가능(당일엔 아직 방문 여부를 알 수 없어서).
    public ConsultationResponse completeConsultation(Long exhibitorId, Long consultationId) {
        Consultation consultation = findOwnedConsultation(exhibitorId, consultationId);

        if (consultation.getStatus() != ConsultationStatus.APPROVED) {
            throw new CustomException(ErrorCode.INVALID_STATE, "승인된 상담만 완료 처리할 수 있습니다.");
        }
        if (!LocalDate.now().isAfter(consultation.getPreferredDate())) {
            throw new CustomException(ErrorCode.INVALID_STATE, "방문 예정일 다음날부터 처리할 수 있습니다.");
        }

        consultation.complete();
        return ConsultationResponse.from(consultation);
    }

    // 승인된 상담을 미방문으로 처리. 조건은 완료 처리와 동일.
    public ConsultationResponse markNoShow(Long exhibitorId, Long consultationId) {
        Consultation consultation = findOwnedConsultation(exhibitorId, consultationId);

        if (consultation.getStatus() != ConsultationStatus.APPROVED) {
            throw new CustomException(ErrorCode.INVALID_STATE, "승인된 상담만 미방문 처리할 수 있습니다.");
        }
        if (!LocalDate.now().isAfter(consultation.getPreferredDate())) {
            throw new CustomException(ErrorCode.INVALID_STATE, "방문 예정일 다음날부터 처리할 수 있습니다.");
        }

        consultation.markNoShow();
        return ConsultationResponse.from(consultation);
    }

    // 요약이 null인 신청에 대해 참가업체가 수동으로 재생성. 상담 1건당 MAX_AI_SUMMARY_RETRY회로 제한(남용 방지).
    public ConsultationResponse regenerateAiSummary(Long exhibitorId, Long consultationId) {
        Consultation consultation = findOwnedConsultation(exhibitorId, consultationId);

        if (!consultation.canRetryAiSummary()) {
            throw new CustomException(ErrorCode.INVALID_STATE, "AI 요약 재시도 횟수를 초과했습니다.");
        }

        consultation.incrementAiSummaryRetryCount();
        aiSummaryClient.summarizeConsultation(consultation.isWantsPurchase(), consultation.isWantsTestDrive(),
                        consultation.getInterestedVehicle(), consultation.isHasDriverLicense(), consultation.getMessage())
                .ifPresent(consultation::attachAiSummary);

        return ConsultationResponse.from(consultation);
    }

    // 부스 단위 상담 상태별 건수 + 방문자(Lead) 수 - 참가업체 대시보드용(건수만, 2026-09-16 확정).
    @Transactional(readOnly = true)
    public BoothStatsResponse getBoothStats(Long exhibitorId, Long boothId) {
        if (!confirmedBoothIds(exhibitorId).contains(boothId)) {
            throw new CustomException(ErrorCode.FORBIDDEN, "본인 부스의 통계만 조회할 수 있습니다.");
        }
        Booth booth = boothRepository.findById(boothId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "부스를 찾을 수 없습니다."));

        Map<ConsultationStatus, Long> counts = consultationRepository.findByBooth_IdInOrderByCreatedAtDesc(List.of(boothId))
                .stream()
                .collect(Collectors.groupingBy(Consultation::getStatus, Collectors.counting()));

        return new BoothStatsResponse(
                boothId, booth.getBoothNo(),
                counts.getOrDefault(ConsultationStatus.REQUESTED, 0L),
                counts.getOrDefault(ConsultationStatus.APPROVED, 0L),
                counts.getOrDefault(ConsultationStatus.REJECTED, 0L),
                counts.getOrDefault(ConsultationStatus.COMPLETED, 0L),
                counts.getOrDefault(ConsultationStatus.NO_SHOW, 0L),
                counts.getOrDefault(ConsultationStatus.CANCELED, 0L),
                leadRepository.countByBooth_Id(boothId));
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
