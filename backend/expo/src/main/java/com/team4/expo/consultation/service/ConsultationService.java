package com.team4.expo.consultation.service;


import com.team4.expo.notification.service.NotificationService;
import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.expo.client.AiSummaryClient;
import com.team4.expo.client.ExhibitorProfile;
import com.team4.expo.client.IdentityClient;
import com.team4.expo.client.ReservationClient;
import com.team4.expo.booth.domain.ApplicationStatus;
import com.team4.expo.booth.domain.Booth;
import com.team4.expo.booth.domain.BoothApplication;
import com.team4.expo.booth.domain.BoothStatus;
import com.team4.expo.consultation.domain.Consultation;
import com.team4.expo.consultation.domain.ConsultationStatus;
import com.team4.expo.lead.domain.Lead;
import com.team4.expo.notification.domain.NotificationType;
import com.team4.expo.booth.dto.BoothReviewEligibilityResponse;
import com.team4.expo.consultation.dto.ConsultationRequest;
import com.team4.expo.consultation.dto.ConsultationResponse;
import com.team4.expo.consultation.dto.ConsultationReviewContextResponse;
import com.team4.expo.consultation.dto.ConsultationReviewDraftResponse;
import com.team4.expo.consultation.dto.ConsultationUpdateRequest;
import com.team4.expo.booth.repository.BoothApplicationRepository;
import com.team4.expo.booth.repository.BoothRepository;
import com.team4.expo.consultation.repository.ConsultationRepository;
import com.team4.expo.lead.repository.LeadRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 고객의 참가업체 상담 신청 제출·조회 (TASK 6-3). 참가업체를 여러 곳 선택해 한 번에 신청하면 업체별로 1건씩 생성된다.
@Service
@Transactional
public class ConsultationService {

    private final BoothRepository boothRepository;
    private final ConsultationRepository consultationRepository;
    private final BoothApplicationRepository boothApplicationRepository;
    private final LeadRepository leadRepository;
    private final ReservationClient reservationClient;
    private final AiSummaryClient aiSummaryClient;
    private final IdentityClient identityClient;
    private final NotificationService notificationService;
    private final ConsultationSlotService consultationSlotService;

    // 같은 참가업체·같은 날짜 중복 신청 차단 대상 상태 - CANCELED/REJECTED만 재신청 허용(2026-09-16 확정).
    // COMPLETED/NO_SHOW도 막아야 함: 완료·미방문 처리된 건은 이미 그 날짜의 상담 "결과"가 난 것이라 같은 날짜로 또 신청하면 안 됨.
    private static final List<ConsultationStatus> DUPLICATE_BLOCKING_STATUSES = List.of(
            ConsultationStatus.REQUESTED, ConsultationStatus.APPROVED,
            ConsultationStatus.COMPLETED, ConsultationStatus.NO_SHOW);

    // 상담 가능한 시간대 - 프론트 CONSULTATION_TIME_SLOTS와 같아야 한다. 이 목록 밖의 시각(예: 14:01)을 허용하면
    // 슬롯별 정원 검사를 우회할 수 있어 서버에서도 막는다.
    private static final Set<LocalTime> ALLOWED_TIMES = Set.of(
            LocalTime.of(10, 0), LocalTime.of(10, 30), LocalTime.of(11, 0), LocalTime.of(11, 30),
            LocalTime.of(13, 0), LocalTime.of(13, 30), LocalTime.of(14, 0), LocalTime.of(14, 30),
            LocalTime.of(15, 0), LocalTime.of(15, 30), LocalTime.of(16, 0));

    // 프론트가 오늘 날짜에서 막는 기준과 같다 - 지금으로부터 20분 이후 시간만 신청할 수 있다.
    private static final int MIN_LEAD_MINUTES = 20;

    public ConsultationService(BoothRepository boothRepository, ConsultationRepository consultationRepository,
                                BoothApplicationRepository boothApplicationRepository, LeadRepository leadRepository,
                                ReservationClient reservationClient, AiSummaryClient aiSummaryClient,
                                IdentityClient identityClient, NotificationService notificationService,
                                ConsultationSlotService consultationSlotService) {
        this.boothRepository = boothRepository;
        this.consultationRepository = consultationRepository;
        this.boothApplicationRepository = boothApplicationRepository;
        this.leadRepository = leadRepository;
        this.reservationClient = reservationClient;
        this.aiSummaryClient = aiSummaryClient;
        this.identityClient = identityClient;
        this.notificationService = notificationService;
        this.consultationSlotService = consultationSlotService;
    }

    public List<ConsultationResponse> applyConsultation(Long customerId, ConsultationRequest request) {
        if (!request.isWantsPurchase() && !request.isWantsTestDrive()) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "구매 상담, 시승 상담 중 최소 하나는 선택해야 합니다.");
        }

        List<Long> boothIds = List.copyOf(new LinkedHashSet<>(request.getBoothIds()));
        List<Booth> booths = boothIds.stream().map(this::findAssignedBooth).toList();

        Long expoId = booths.get(0).getExpo().getId();
        boolean sameExpo = booths.stream().allMatch(b -> b.getExpo().getId().equals(expoId));
        if (!sameExpo) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "같은 박람회의 참가업체끼리만 함께 신청할 수 있습니다.");
        }

        validateSchedule(request.getPreferredDate(), request.getPreferredTime());

        boolean hasTicket = reservationClient.hasTicket(customerId, expoId, request.getPreferredDate());
        if (!hasTicket) {
            throw new CustomException(ErrorCode.INVALID_STATE, "신청 날짜의 박람회 입장권을 보유하고 있어야 합니다.");
        }

        for (Booth booth : booths) {
            boolean alreadyApplied = consultationRepository.existsByCustomerIdAndBooth_IdAndPreferredDateAndStatusIn(
                    customerId, booth.getId(), request.getPreferredDate(), DUPLICATE_BLOCKING_STATUSES);
            if (alreadyApplied) {
                throw new CustomException(ErrorCode.DUPLICATE, "같은 날짜에 이미 상담을 신청한 참가업체입니다: " + booth.getBoothNo());
            }
        }

        // 부스 id 오름차순으로 잠가야 여러 부스를 함께 신청하는 동시 요청끼리 데드락이 나지 않는다.
        booths.stream().map(Booth::getId).sorted().forEach(boothId ->
                consultationSlotService.ensureSlotAvailable(boothId, request.getPreferredDate(), request.getPreferredTime()));

        List<Consultation> consultations = booths.stream()
                .map(booth -> new Consultation(booth, customerId, request.getCustomerName(), request.getCustomerPhone(),
                        request.getCustomerEmail(), request.isWantsPurchase(), request.isWantsTestDrive(),
                        request.getInterestedVehicle(), request.isHasDriverLicense(),
                        request.getPreferredDate(), request.getPreferredTime(), request.getMessage(),
                        request.isLeadConsent()))
                .toList();

        // 신청 내용은 업체 수와 무관하게 동일하므로 요약도 한 번만 생성해 모든 건에 붙인다.
        aiSummaryClient.summarizeConsultation(request.isWantsPurchase(), request.isWantsTestDrive(),
                        request.getInterestedVehicle(), request.isHasDriverLicense(), request.getMessage())
                .ifPresent(summary -> consultations.forEach(c -> c.attachAiSummary(summary)));

        consultationRepository.saveAll(consultations);

        consultations.forEach(consultation -> exhibitorIdOf(consultation.getBooth()).ifPresent(exhibitorId ->
                notificationService.notify(
                        exhibitorId,
                        NotificationType.CONSULTATION_RECEIVED,
                        "새로운 상담 신청이 접수되었습니다",
                        request.getCustomerName() + "님이 " + consultation.getBooth().getBoothNo()
                                + " 부스에 상담을 신청했습니다.",
                        consultation.getId())));

        return consultations.stream().map(ConsultationResponse::from).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ConsultationResponse> listMyConsultations(Long customerId) {
        return consultationRepository.findByCustomerIdOrderByCreatedAtDesc(customerId).stream()
                .map(c -> ConsultationResponse.from(c, companyNameOf(c.getBooth())))
                .collect(Collectors.toList());
    }

    // post(부스 소개 콘텐츠)와 동일한 방식으로 업체명 조회, 실패 시 null(화면에서 부스 번호로 폴백)
    private String companyNameOf(Booth booth) {
        return boothApplicationRepository.findByBooth_IdAndStatus(booth.getId(), ApplicationStatus.CONFIRMED)
                .map(BoothApplication::getExhibitorId)
                .flatMap(identityClient::getExhibitorProfile)
                .map(ExhibitorProfile::companyName)
                .orElse(null);
    }

    // 이 부스를 확정 배정받은 참가업체 id (알림 수신자 결정용). 없으면(데이터 이상) 알림을 건너뛴다.
    private Optional<Long> exhibitorIdOf(Booth booth) {
        return boothApplicationRepository.findByBooth_IdAndStatus(booth.getId(), ApplicationStatus.CONFIRMED)
                .map(BoothApplication::getExhibitorId);
    }

    // 대기 중(REQUESTED)인 본인 상담 신청 내용 수정. 방문 날짜를 바꾸면 그 날짜 입장권 보유·중복 신청 여부를 다시 검증한다.
    public ConsultationResponse updateConsultation(Long customerId, Long consultationId, ConsultationUpdateRequest request) {
        if (!request.isWantsPurchase() && !request.isWantsTestDrive()) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "구매 상담, 시승 상담 중 최소 하나는 선택해야 합니다.");
        }

        Consultation consultation = findOwnedConsultation(customerId, consultationId);
        if (consultation.getStatus() != ConsultationStatus.REQUESTED) {
            throw new CustomException(ErrorCode.INVALID_STATE, "대기 중인 상담만 수정할 수 있습니다.");
        }

        Booth booth = consultation.getBooth();
        // 날짜나 시간을 바꿀 때만 검증한다 - 안 바꾸면 이미 지난 일정의 대기 건도 다른 내용은 수정할 수 있어야 한다.
        boolean scheduleChanged = !consultation.getPreferredDate().equals(request.getPreferredDate())
                || !consultation.getPreferredTime().equals(request.getPreferredTime());
        if (scheduleChanged) {
            validateSchedule(request.getPreferredDate(), request.getPreferredTime());
        }
        if (!consultation.getPreferredDate().equals(request.getPreferredDate())) {
            boolean hasTicket = reservationClient.hasTicket(customerId, booth.getExpo().getId(), request.getPreferredDate());
            if (!hasTicket) {
                throw new CustomException(ErrorCode.INVALID_STATE, "신청 날짜의 박람회 입장권을 보유하고 있어야 합니다.");
            }
            boolean alreadyApplied = consultationRepository.existsByCustomerIdAndBooth_IdAndPreferredDateAndStatusIn(
                    customerId, booth.getId(), request.getPreferredDate(), DUPLICATE_BLOCKING_STATUSES);
            if (alreadyApplied) {
                throw new CustomException(ErrorCode.DUPLICATE, "같은 날짜에 이미 상담을 신청한 참가업체입니다: " + booth.getBoothNo());
            }
        }

        // 날짜나 시간을 바꿨을 때만 새 슬롯의 정원을 확인한다(같은 슬롯 그대로면 이미 자리를 차지한 상태).
        if (scheduleChanged) {
            consultationSlotService.ensureSlotAvailable(booth.getId(), request.getPreferredDate(), request.getPreferredTime());
        }

        consultation.updateDetails(request.isWantsPurchase(), request.isWantsTestDrive(), request.getInterestedVehicle(),
                request.isHasDriverLicense(), request.getPreferredDate(), request.getPreferredTime(), request.getMessage(),
                request.isLeadConsent());

        aiSummaryClient.summarizeConsultation(request.isWantsPurchase(), request.isWantsTestDrive(),
                        request.getInterestedVehicle(), request.isHasDriverLicense(), request.getMessage())
                .ifPresent(consultation::attachAiSummary);

        return ConsultationResponse.from(consultation);
    }

    // 대기 중(REQUESTED)인 본인 상담 신청 취소.
    public ConsultationResponse cancelConsultation(Long customerId, Long consultationId) {
        Consultation consultation = findOwnedConsultation(customerId, consultationId);
        if (consultation.getStatus() != ConsultationStatus.REQUESTED) {
            throw new CustomException(ErrorCode.INVALID_STATE, "대기 중인 상담만 취소할 수 있습니다.");
        }
        consultation.cancel();
        return ConsultationResponse.from(consultation);
    }

    // Review 서비스 -> Expo 내부 호출(TASK 8-3, TASK 7-2). 상담후기(CONSULT)는 그 부스 상담을 완료(COMPLETED) 후
    // 5일 이내여야 하고, 부스후기(BOOTH)는 상담과 무관하게 방문 기록(Lead)이 있고 방문 후 5일 이내면 된다
    // (워크인 방문객도 부스후기는 쓸 수 있게 하기 위함, 2026-09-16 확정).
    @Transactional(readOnly = true)
    public BoothReviewEligibilityResponse getBoothReviewEligibility(Long boothId, Long customerId, String reviewType, Long consultationId) {
        Booth booth = boothRepository.findById(boothId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "부스를 찾을 수 없습니다."));

        boolean eligible = "BOOTH".equals(reviewType)
                ? leadRepository.findByBooth_IdAndCustomerId(boothId, customerId)
                        .stream().anyMatch(Lead::isReviewable)
                : consultationId != null
                        // 상담후기는 상담 1건당 후기 1개라 대상 상담을 지정한다 - 본인 소유·해당 부스·작성 가능(완료 후 5일 이내)이어야 한다.
                        ? consultationRepository.findById(consultationId)
                                .filter(c -> c.getCustomerId().equals(customerId) && c.getBooth().getId().equals(boothId))
                                .map(Consultation::isReviewable).orElse(false)
                        : consultationRepository.findByCustomerIdAndBooth_IdAndStatus(customerId, boothId, ConsultationStatus.COMPLETED)
                                .stream().anyMatch(Consultation::isReviewable);

        return new BoothReviewEligibilityResponse(eligible, booth.getBoothNo(), companyNameOf(booth), booth.getExpo().getTitle());
    }

    // 후기 작성 화면의 "상담내용" 패널 - 본인 요구사항 + 참가업체 현장 메모의 AI 요약본(있으면).
    // Lead.interestNote는 참가업체가 현장에서 직접 적은 원문(고객 후기에 노출하면 안 됨) - 반드시
    // emailSummary(Gemini가 정리한 버전)만 보여준다. 작성 가능한(reviewable) 상담만 허용.
    @Transactional(readOnly = true)
    public ConsultationReviewContextResponse getReviewContext(Long customerId, Long consultationId) {
        Consultation consultation = findReviewableConsultation(customerId, consultationId);
        String exhibitorNote = leadRepository.findByConsultation_Id(consultationId)
                .map(Lead::getEmailSummary)
                .orElse(null);

        return new ConsultationReviewContextResponse(consultation.getInterestedVehicle(),
                consultation.isWantsPurchase(), consultation.isWantsTestDrive(),
                consultation.getMessage(), exhibitorNote);
    }

    // AI 후기 초안 생성 - 같은 컨텍스트(요구사항+참가업체 메모의 AI 요약본)로 Gemini에 초안을 요청. 실패 시 draft=null(fail-open).
    public ConsultationReviewDraftResponse draftReview(Long customerId, Long consultationId, String reviewType, String vehicleName) {
        Consultation consultation = findReviewableConsultation(customerId, consultationId);
        String exhibitorNote = leadRepository.findByConsultation_Id(consultationId)
                .map(Lead::getEmailSummary)
                .orElse(null);

        String draft = aiSummaryClient
                .draftReview(reviewType, vehicleName, consultation.getMessage(), exhibitorNote)
                .orElse(null);

        return new ConsultationReviewDraftResponse(draft);
    }

    // 후기 작성 화면 - 고객이 쓴 문장을 AI로 다듬기. 상담 신청과 무관하게(워크인 부스후기 포함) 쓸 수 있어 상담 조회 없이 문장만 넘긴다.
    // 실패 시 draft=null(fail-open) - 프론트는 원문을 그대로 두고 안내만 한다.
    public ConsultationReviewDraftResponse polishReview(String reviewType, String vehicleName, String content) {
        return new ConsultationReviewDraftResponse(
                aiSummaryClient.polishReview(reviewType, vehicleName, content).orElse(null));
    }

    private Consultation findReviewableConsultation(Long customerId, Long consultationId) {
        Consultation consultation = findOwnedConsultation(customerId, consultationId);
        if (!consultation.isReviewable()) {
            throw new CustomException(ErrorCode.INVALID_STATE, "후기를 작성할 수 있는 상담이 아닙니다.");
        }
        return consultation;
    }

    // 신청 가능한 시간대(ALLOWED_TIMES)인지, 이미 지났거나 임박(20분 이내)하지 않은지 확인한다.
    private void validateSchedule(LocalDate date, LocalTime time) {
        if (!ALLOWED_TIMES.contains(time)) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "상담 가능한 시간대가 아닙니다: " + time);
        }
        if (LocalDateTime.of(date, time).isBefore(LocalDateTime.now().plusMinutes(MIN_LEAD_MINUTES))) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "이미 지났거나 임박한 시간에는 상담을 신청할 수 없습니다.");
        }
    }

    private Consultation findOwnedConsultation(Long customerId, Long consultationId) {
        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "상담 신청을 찾을 수 없습니다."));
        if (!consultation.getCustomerId().equals(customerId)) {
            throw new CustomException(ErrorCode.FORBIDDEN, "본인이 신청한 상담만 처리할 수 있습니다.");
        }
        return consultation;
    }

    private Booth findAssignedBooth(Long boothId) {
        Booth booth = boothRepository.findById(boothId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "부스를 찾을 수 없습니다."));
        if (booth.getStatus() != BoothStatus.ASSIGNED) {
            throw new CustomException(ErrorCode.INVALID_STATE, "참가 확정된 부스에만 상담을 신청할 수 있습니다.");
        }
        return booth;
    }
}
