package com.team4.expo.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.expo.client.AiSummaryClient;
import com.team4.expo.client.ExhibitorProfile;
import com.team4.expo.client.IdentityClient;
import com.team4.expo.client.ReservationClient;
import com.team4.expo.domain.*;
import com.team4.expo.dto.*;
import com.team4.expo.repository.BoothApplicationRepository;
import com.team4.expo.repository.BoothRepository;
import com.team4.expo.repository.ExpoRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 박람회·부스 자체의 등록/공개/조회. 부스 참가 신청(그룹) 관련 로직은 BoothApplicationService 계열 참고.
@Service
@Transactional
public class ExpoService {

    private final ExpoRepository expoRepository;
    private final BoothRepository boothRepository;
    private final BoothApplicationRepository boothApplicationRepository;
    private final BoothApplicationValidator validator;
    private final IdentityClient identityClient;
    private final ReservationClient reservationClient;
    private final NotificationService notificationService;
    private final AiSummaryClient aiSummaryClient;

    public ExpoService(ExpoRepository expoRepository, BoothRepository boothRepository,
                       BoothApplicationRepository boothApplicationRepository,
                       BoothApplicationValidator validator,
                       IdentityClient identityClient,
                       ReservationClient reservationClient,
                       NotificationService notificationService,
                       AiSummaryClient aiSummaryClient) {
        this.expoRepository = expoRepository;
        this.boothRepository = boothRepository;
        this.boothApplicationRepository = boothApplicationRepository;
        this.validator = validator;
        this.identityClient = identityClient;
        this.reservationClient = reservationClient;
        this.notificationService = notificationService;
        this.aiSummaryClient = aiSummaryClient;
    }

    // 부스가 배정 완료(ASSIGNED) 상태면 확정된 신청의 exhibitorId로 Identity에서 회사명/업종을 붙여줌.
    // 미배정이거나 Identity 조회가 실패하면 companyName/industry는 null로 내려감(화면 표시만 못 할 뿐 전체 조회는 계속 성공).
    private BoothDetail toBoothDetail(Booth booth, boolean withinApplyPeriod) {
        String companyName = null;
        String industry = null;

        if (booth.getStatus() == BoothStatus.ASSIGNED) {
            Optional<BoothApplication> confirmed =
                    boothApplicationRepository.findByBooth_IdAndStatus(booth.getId(), ApplicationStatus.CONFIRMED);
            if (confirmed.isPresent()) {
                Optional<ExhibitorProfile> profile = identityClient.getExhibitorProfile(confirmed.get().getExhibitorId());
                if (profile.isPresent()) {
                    companyName = profile.get().companyName();
                    industry = profile.get().industry();
                }
            }
        }

        return BoothDetail.of(booth, withinApplyPeriod, companyName, industry);
    }

    // 내부 API(Reservation -> Expo)용 — 방문 예약 시점에 무료/유료를 가르는 데 필요한 최소 정보만 조회.
    @Transactional(readOnly = true)
    public ExpoInternalInfoResponse getExpoInternalInfo(Long expoId) {
        Expo expo = expoRepository.findById(expoId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "박람회를 찾을 수 없습니다."));
        return ExpoInternalInfoResponse.from(expo);
    }

    // 박람회와 부스 목록을 등록 (관리자용, 등록 직후엔 비공개 DRAFT 상태).
    public ExpoResponse registerExpo(ExpoRegisterRequest request) {
        validateDateOrder(request.getApplyStartsAt(), request.getApplyEndsAt(), request.getStartsAt(), request.getEndsAt());
        validateNoDuplicateBoothNo(request.getBooths());

        Expo expo = new Expo(
                request.getTitle(),
                request.getVenue(),
                request.getStartsAt(),
                request.getEndsAt(),
                request.getApplyStartsAt(),
                request.getApplyEndsAt(),
                request.getAdmissionFee(),
                request.getDescription()
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

    // 공개된 박람회를 다시 비공개로 전환. 부스 신청이 하나라도 있으면 전환할 수 없음
    public ExpoResponse closeExpo(Long expoId) {
        Expo expo = expoRepository.findById(expoId).orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND));

        if (expo.getStatus() != ExpoStatus.OPEN) {
            throw new CustomException(ErrorCode.INVALID_STATE);
        }
        if (!boothApplicationRepository.findByBooth_Expo_Id(expoId).isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_STATE, "부스 신청이 있는 박람회는 비공개로 전환할 수 없습니다.");
        }

        expo.close();

        return new ExpoResponse(expo.getId(), expo.getStatus(), null);
    }

    // Admin - 수정 화면 진입 시 기존 값을 채워주기 위한 단건 조회
    @Transactional(readOnly = true)
    public ExpoSummaryResponse getExpoForAdmin(Long expoId) {
        Expo expo = expoRepository.findById(expoId).orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "박람회를 찾을 수 없습니다."));

        boolean hasApplications = !boothApplicationRepository.findByBooth_Expo_Id(expoId).isEmpty();

        return ExpoSummaryResponse.of(expo, ExpoPhase.of(expo, LocalDateTime.now()), boothRepository.countByExpo_IdAndStatus(expoId, BoothStatus.ASSIGNED), hasApplications);
    }

    // 박람회 정보 수정.
    // 부스 신청이 하나라도 들어온 뒤에는 일정(신청/개최 기간) 수정 불가.
    // 제목/장소/입장료는 상태·신청 여부와 무관하게 항상 수정 가능.
    public ExpoResponse updateExpo(Long expoId, ExpoUpdateRequest request) {
        Expo expo = expoRepository.findById(expoId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "박람회를 찾을 수 없습니다."));

        validateDateOrder(request.getApplyStartsAt(), request.getApplyEndsAt(), request.getStartsAt(), request.getEndsAt());

        boolean scheduleChanged = !expo.getStartsAt().isEqual(request.getStartsAt())
                || !expo.getEndsAt().isEqual(request.getEndsAt())
                || !expo.getApplyStartsAt().isEqual(request.getApplyStartsAt())
                || !expo.getApplyEndsAt().isEqual(request.getApplyEndsAt());

        if (scheduleChanged && !boothApplicationRepository.findByBooth_Expo_Id(expoId).isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_STATE, "부스 신청이 있는 박람회는 일정을 수정할 수 없습니다.");
        }

        // 고객 QR(방문예약)은 개최 기간(startsAt~endsAt)만 영향을 받음 - 신청기간(applyStartsAt/applyEndsAt)만 바뀌는 건 무관.
        // 개최 기간이 바뀌면 Reservation에 알려 새 기간 밖으로 벗어난 QR만 취소하고 영향받은 고객 전체에게 알림 발송.
        boolean hostPeriodChanged = !expo.getStartsAt().isEqual(request.getStartsAt()) || !expo.getEndsAt().isEqual(request.getEndsAt());

        if (hostPeriodChanged) {
            reservationClient.applyScheduleChange(expoId, request.getStartsAt().toLocalDate(), request.getEndsAt().toLocalDate())
                    .forEach(ticket -> {
                        if (ticket.cancelled()) {
                            notificationService.notify(ticket.customerId(), NotificationType.EXPO_TICKET_CANCELLED,
                                    "방문예약 취소 안내",
                                    expo.getTitle() + "의 일정 변경으로 " + ticket.visitDate() + " 방문예약이 취소되었습니다. 다시 신청해주세요.",
                                    expoId);
                        } else {
                            notificationService.notify(ticket.customerId(), NotificationType.EXPO_SCHEDULE_CHANGED,
                                    "박람회 일정 변경 안내",
                                    expo.getTitle() + "의 일정이 변경되었습니다. " + ticket.visitDate() + " 방문예약은 그대로 유효합니다.",
                                    expoId);
                        }
                    });
        }

        expo.update(request.getTitle(), request.getVenue(), request.getStartsAt(), request.getEndsAt(),
                request.getApplyStartsAt(), request.getApplyEndsAt(), request.getAdmissionFee(), request.getDescription());

        return new ExpoResponse(expo.getId(), expo.getStatus(), null);
    }

    // 박람회 삭제. 부스 신청이 하나도 없으면 삭제 가능
    public void deleteExpo(Long expoId) {
        Expo expo = expoRepository.findById(expoId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "박람회를 찾을 수 없습니다."));

        if (!boothApplicationRepository.findByBooth_Expo_Id(expoId).isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_STATE, "부스 신청이 있는 박람회는 삭제할 수 없습니다.");
        }

        boothRepository.deleteAll(boothRepository.findByExpo_IdOrderByBoothNo(expoId));
        expoRepository.delete(expo);
    }

    // Admin - 전체 박람회 목록(상태 무관) + 박람회별 부스·신청 현황 집계
    @Transactional(readOnly = true)
    public Page<ExpoAdminSummaryResponse> listExposForAdmin(Pageable pageable) {
        Page<Expo> expos = expoRepository.findAll(pageable);
        return expos.map(expo -> {
            List<Booth> booths = boothRepository.findByExpo_IdOrderByBoothNo(expo.getId());
            int availableBooths = (int) booths.stream().filter(b -> b.getStatus() == BoothStatus.AVAILABLE).count();

            List<BoothApplication> applications = boothApplicationRepository.findByBooth_Expo_Id(expo.getId());
            int pending = (int) applications.stream().filter(a -> a.getStatus() == ApplicationStatus.SUBMITTED).count();
            int approved = (int) applications.stream().filter(a ->
                    a.getStatus() == ApplicationStatus.PAYMENT_PENDING || a.getStatus() == ApplicationStatus.CONFIRMED).count();
            int rejected = (int) applications.stream().filter(a -> a.getStatus() == ApplicationStatus.REJECTED).count();

            return new ExpoAdminSummaryResponse(
                    expo.getId(), expo.getTitle(), expo.getBannerImageUrl(), expo.getStatus(),
                    expo.getApplyStartsAt(), expo.getApplyEndsAt(),
                    booths.size(), availableBooths,
                    applications.size(), pending, approved, rejected
            );
        });
    }

    // Admin - 박람회 부스 배치 현황 (공개 여부와 무관하게 조회 가능, EXHIBITOR용 getExpoBooths와 달리 OPEN 필터 없음)
    @Transactional(readOnly = true)
    public ExpoBoothsResponse getExpoBoothsForAdmin(Long expoId) {
        Expo expo = expoRepository.findById(expoId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "박람회를 찾을 수 없습니다."));

        List<Booth> allBooths = boothRepository.findByExpo_IdOrderByBoothNo(expoId);
        boolean withinApplyPeriod = validator.isWithinApplyPeriod(expo, LocalDateTime.now());
        int availableCount = (int) allBooths.stream().filter(b -> b.getStatus() == BoothStatus.AVAILABLE).count();
        List<BoothDetail> views = allBooths.stream().map(b -> toBoothDetail(b, withinApplyPeriod)).toList();

        return new ExpoBoothsResponse(expo.getId(), expo.getTitle(), allBooths.size(), availableCount, views);
    }

    // open 박람회 목록 페이징 조회
    @Transactional(readOnly = true)
    public Page<ExpoSummaryResponse> listOpenExpos(Pageable pageable){
        LocalDateTime now = LocalDateTime.now();
        return expoRepository.findByStatus(ExpoStatus.OPEN, pageable)
                .map(expo -> ExpoSummaryResponse.of(expo, ExpoPhase.of(expo, now), boothRepository.countByExpo_IdAndStatus(expo.getId(), BoothStatus.ASSIGNED)));
    }

    // 비회원 - 공개 박람회 단건 조회
    @Transactional(readOnly = true)
    public ExpoSummaryResponse getPublicExpo(Long expoId) {
        Expo expo = expoRepository.findById(expoId)
                .filter(e -> e.getStatus() == ExpoStatus.OPEN)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "박람회를 찾을 수 없습니다."));

        return ExpoSummaryResponse.of(expo, ExpoPhase.of(expo, LocalDateTime.now()), boothRepository.countByExpo_IdAndStatus(expoId, BoothStatus.ASSIGNED));
    }

    // 특정 박람회의 부스 목록 조회. DRAFT(비공개) 및 없는 박람회는 404
    @Transactional(readOnly = true)
    public ExpoBoothsResponse getExpoBooths(Long expoId, BoothStatus status) {
        Expo expo = expoRepository.findById(expoId)
                .filter(e -> e.getStatus() == ExpoStatus.OPEN)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "박람회를 찾을 수 없습니다."));

        List<Booth> allBooths = boothRepository.findByExpo_IdOrderByBoothNo(expoId);
        boolean withinApplyPeriod = validator.isWithinApplyPeriod(expo, LocalDateTime.now());

        // 예약 가능 부스 수
        int availableCount = (int) allBooths.stream()
                .filter(b -> b.getStatus() == BoothStatus.AVAILABLE)
                .count();

        List<BoothDetail> views = allBooths.stream()
                .filter(b -> status == null || b.getStatus() == status)
                .map(b -> toBoothDetail(b, withinApplyPeriod))
                .toList();

        return new ExpoBoothsResponse(expo.getId(), expo.getTitle(), allBooths.size(), availableCount, views);
    }

    // 신청기간 <= 행사시작 < 행사종료 순서로 날짜가 맞는지 확인
    private void validateDateOrder(LocalDateTime applyStartsAt, LocalDateTime applyEndsAt, LocalDateTime startsAt, LocalDateTime endsAt) {
        boolean valid = applyStartsAt.isBefore(applyEndsAt)
                && !applyEndsAt.isAfter(startsAt)
                && startsAt.isBefore(endsAt);

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

    @Transactional(readOnly = true)
    public ExpoDescriptionDraftResponse draftExpoDescription(String title, String venue) {
        return new ExpoDescriptionDraftResponse(aiSummaryClient.draftExpoDescription(title, venue).orElse(null));
    }
}
