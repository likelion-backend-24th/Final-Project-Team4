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
import com.team4.expo.dto.*;
import com.team4.expo.repository.BoothApplicationGroupRepository;
import com.team4.expo.repository.BoothApplicationRepository;
import com.team4.expo.repository.BoothRepository;
import com.team4.expo.repository.ExpoRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
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
    private final BoothApplicationGroupRepository boothApplicationGroupRepository;

    public ExpoService(ExpoRepository expoRepository, BoothRepository boothRepository,
                        BoothApplicationRepository boothApplicationRepository,
                        BoothApplicationGroupRepository boothApplicationGroupRepository) {
        this.expoRepository = expoRepository;
        this.boothRepository = boothRepository;
        this.boothApplicationRepository = boothApplicationRepository;
        this.boothApplicationGroupRepository = boothApplicationGroupRepository;
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

    // 참가업체가 부스 하나 이상을 골라 그룹으로 신청 (다중 선택). saveMode=SUBMIT이면 검증 후 SUBMITTED,
    // DRAFT면 검증 없이 임시저장. 검증 실패 시 그룹 전체가 롤백됨(부분 제출 불허, 2026-09-03 확정).
    public BoothApplicationGroupResponse applyBooth(Long exhibitorId, BoothApplicationRequest request) {
        Expo expo = expoRepository.findById(request.getExpoId())
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "박람회를 찾을 수 없습니다."));

        boolean isSubmit = request.getSaveMode() == BoothApplicationRequest.SaveMode.SUBMIT;
        if (isSubmit) {
            validateApplicationPeriod(expo);
        }

        BoothApplicationGroup group = new BoothApplicationGroup(
                expo,
                exhibitorId,
                request.getExhibitionItem(),
                request.getConceptDescription(),
                request.isPowerRequested(),
                request.isWaterSupplyRequested(),
                request.isInternetRequested(),
                request.getAdditionalRequest()
        );
        boothApplicationGroupRepository.save(group);

        List<BoothApplication> applications = new ArrayList<>();
        for (Long boothId : request.getBoothIds()) {
            Booth booth = boothRepository.findById(boothId)
                    .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "부스를 찾을 수 없습니다."));
            validateBoothBelongsToExpo(booth, expo);

            ApplicationStatus status;
            if (isSubmit) {
                validateBoothAvailable(booth);
                validateNoDuplicateApplication(booth.getId(), exhibitorId);
                status = ApplicationStatus.SUBMITTED;
            } else {
                status = ApplicationStatus.DRAFT;
            }

            applications.add(new BoothApplication(booth, group, exhibitorId, status));
        }
        boothApplicationRepository.saveAll(applications);

        return BoothApplicationGroupResponse.from(group.getId(), applications);
    }

    // 임시저장(DRAFT) 그룹의 부스 선택·입력 내용 수정. DRAFT 상태인 그룹만 가능.
    public BoothApplicationGroupResponse updateBoothApplicationDraft(Long exhibitorId, String groupId,
                                                                       BoothApplicationDraftUpdateRequest request) {
        BoothApplicationGroup group = boothApplicationGroupRepository.findById(groupId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "신청 그룹을 찾을 수 없습니다."));
        validateGroupOwnership(group, exhibitorId);

        List<BoothApplication> existing = boothApplicationRepository.findByGroup_Id(groupId);
        validateAllDraft(existing);

        group.updateContent(
                request.getExhibitionItem(),
                request.getConceptDescription(),
                request.isPowerRequested(),
                request.isWaterSupplyRequested(),
                request.isInternetRequested(),
                request.getAdditionalRequest()
        );

        boothApplicationRepository.deleteAll(existing);

        List<BoothApplication> applications = new ArrayList<>();
        for (Long boothId : request.getBoothIds()) {
            Booth booth = boothRepository.findById(boothId)
                    .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "부스를 찾을 수 없습니다."));
            validateBoothBelongsToExpo(booth, group.getExpo());
            applications.add(new BoothApplication(booth, group, exhibitorId, ApplicationStatus.DRAFT));
        }
        boothApplicationRepository.saveAll(applications);

        return BoothApplicationGroupResponse.from(groupId, applications);
    }

    // DRAFT 그룹을 최종 제출 (DRAFT -> SUBMITTED). 이 시점에 신청기간/부스가용/중복 검증 수행,
    // 그룹 내 하나라도 실패하면 그룹 전체 롤백(부분 제출 불허).
    public BoothApplicationGroupResponse submitBoothApplicationDraft(Long exhibitorId, String groupId) {
        BoothApplicationGroup group = boothApplicationGroupRepository.findById(groupId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "신청 그룹을 찾을 수 없습니다."));
        validateGroupOwnership(group, exhibitorId);

        List<BoothApplication> applications = boothApplicationRepository.findByGroup_Id(groupId);
        validateAllDraft(applications);

        validateApplicationPeriod(group.getExpo());

        for (BoothApplication application : applications) {
            validateBoothAvailable(application.getBooth());
            validateNoDuplicateApplication(application.getBooth().getId(), exhibitorId);
        }
        applications.forEach(BoothApplication::submit);

        return BoothApplicationGroupResponse.from(groupId, applications);
    }

    // 신청 취소. 결제 대기·확정 건이 하나라도 있으면 취소 불가(환불 절차를 타야 함).
    public BoothApplicationGroupCancelResponse deleteBoothApplicationGroup(Long exhibitorId, String groupId) {
        BoothApplicationGroup group = boothApplicationGroupRepository.findById(groupId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "신청 그룹을 찾을 수 없습니다."));
        validateGroupOwnership(group, exhibitorId);

        List<BoothApplication> applications = boothApplicationRepository.findByGroup_Id(groupId);
        boolean hasPaymentInProgress = applications.stream().anyMatch(a ->
                a.getStatus() == ApplicationStatus.PAYMENT_PENDING || a.getStatus() == ApplicationStatus.CONFIRMED);
        if (hasPaymentInProgress) {
            throw new CustomException(ErrorCode.INVALID_STATE, "결제 진행 중이거나 확정된 신청은 취소할 수 없습니다.");
        }

        applications.forEach(BoothApplication::cancel);

        return new BoothApplicationGroupCancelResponse(groupId, ApplicationStatus.CANCELLED.name());
    }

    // 신청 그룹의 소유자가 요청자 본인인지 확인
    private void validateGroupOwnership(BoothApplicationGroup group, Long exhibitorId) {
        if (!group.getExhibitorId().equals(exhibitorId)) {
            throw new CustomException(ErrorCode.FORBIDDEN, "본인 신청 그룹이 아닙니다.");
        }
    }

    // 그룹 내 모든 부스 신청이 DRAFT 상태인지 확인 (수정·제출은 DRAFT에서만 가능)
    private void validateAllDraft(List<BoothApplication> applications) {
        boolean allDraft = applications.stream().allMatch(a -> a.getStatus() == ApplicationStatus.DRAFT);
        if (!allDraft) {
            throw new CustomException(ErrorCode.INVALID_STATE, "임시저장 상태의 신청만 처리할 수 있습니다.");
        }
    }

    // 마이페이지 - 본인이 신청한 부스 신청 그룹 목록(그룹 단위, 부스별 상태 포함)
    @Transactional(readOnly = true)
    public Page<BoothApplicationGroupDetailResponse> listMyBoothApplications(Long exhibitorId, Pageable pageable) {
        Page<BoothApplicationGroup> groups = boothApplicationGroupRepository.findByExhibitorIdOrderByCreatedAtDesc(exhibitorId, pageable);
        return groups.map(group -> BoothApplicationGroupDetailResponse.of(
                group, boothApplicationRepository.findByGroup_Id(group.getId())));
    }

    // Admin - 전체 부스 신청 그룹 목록(그룹 단위, 부스별 상태 포함)
    @Transactional(readOnly = true)
    public Page<BoothApplicationGroupDetailResponse> listBoothApplications(Pageable pageable) {
        Page<BoothApplicationGroup> groups = boothApplicationGroupRepository.findAllByOrderByCreatedAtDesc(pageable);
        return groups.map(group -> BoothApplicationGroupDetailResponse.of(
                group, boothApplicationRepository.findByGroup_Id(group.getId())));
    }

    private static final List<ApplicationStatus> COMPETING_STATUSES =
            List.of(ApplicationStatus.PAYMENT_PENDING, ApplicationStatus.CONFIRMED);

    // Admin - 부스 참가 신청 승인 (SUBMITTED -> PAYMENT_PENDING).
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

    // Admin - 부스 참가 신청 반려 (SUBMITTED -> REJECTED)
    public BoothApplicationDecisionResponse rejectBoothApplication(Long applicationId, String reason) {
        BoothApplication application = boothApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "신청을 찾을 수 없습니다."));

        if (application.getStatus() != ApplicationStatus.SUBMITTED) {
            throw new CustomException(ErrorCode.INVALID_STATE, "심사 대기 상태의 신청만 반려할 수 있습니다.");
        }

        application.reject(reason);
        return BoothApplicationDecisionResponse.from(application);
    }

    // Payment -> Expo 내부 API. 결제 시작 전 그룹의 심사 완료 여부·결제 대상·금액 확인.
    @Transactional(readOnly = true)
    public BoothApplicationGroupPaymentContextResponse getBoothApplicationGroupPaymentContext(String groupId) {
        BoothApplicationGroup group = boothApplicationGroupRepository.findById(groupId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "신청 그룹을 찾을 수 없습니다."));
        List<BoothApplication> applications = boothApplicationRepository.findByGroup_Id(groupId);

        return BoothApplicationGroupPaymentContextResponse.of(group, applications);
    }

    // Payment -> Expo 내부 API. 결제 완료 확인 후 그룹 내 승인된 부스들을 부스별 독립적으로 확정.
    // 결제 완료 순(선착순)이 아니라 이미 관리자 승인 시점에 부스가 RESERVED로 잠겨있으므로,
    // 여기서는 그 잠금을 최종 확정(ASSIGNED)으로 바꾸기만 하면 된다. paymentId/paidAt은 현재
    // 감사 로그성 정보로만 받음(별도 저장 안 함, Payment 쪽 결제 원장이 원본).
    public BoothApplicationGroupConfirmResponse confirmBoothApplicationGroup(String groupId, String paymentId, LocalDateTime paidAt) {
        BoothApplicationGroup group = boothApplicationGroupRepository.findById(groupId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "신청 그룹을 찾을 수 없습니다."));
        List<BoothApplication> applications = boothApplicationRepository.findByGroup_Id(groupId);

        List<BoothApplication> targets = applications.stream()
                .filter(a -> a.getStatus() == ApplicationStatus.PAYMENT_PENDING || a.getStatus() == ApplicationStatus.CONFIRMED)
                .collect(Collectors.toList());
        if (targets.isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_STATE, "확정할 승인된 신청이 없습니다.");
        }

        List<BoothApplicationGroupConfirmResponse.Result> results = new ArrayList<>();
        for (BoothApplication application : targets) {
            if (application.getStatus() == ApplicationStatus.CONFIRMED) {
                // 같은 paymentId로 재요청된 경우(멱등) - 이미 확정된 건 그대로 반환, 재처리 안 함
                results.add(new BoothApplicationGroupConfirmResponse.Result(
                        application.getId(), application.getBooth().getId(), application.getStatus()));
                continue;
            }

            Booth booth = application.getBooth();
            if (booth.getStatus() == BoothStatus.RESERVED) {
                booth.assign();
                application.confirm();
            } else {
                // 방어 로직: 정상 흐름이면 승인 시점에 RESERVED로 잠겨 있어야 함. 그렇지 않다면 데이터 불일치이므로
                // 확정 대신 환불 대상으로 표시.
                application.requireRefund();
            }
            results.add(new BoothApplicationGroupConfirmResponse.Result(
                    application.getId(), booth.getId(), application.getStatus()));
        }

        return new BoothApplicationGroupConfirmResponse(groupId, results);
    }

    // Payment -> Expo 내부 API. 결제 실패/시간 초과 시 호출. 승인(PAYMENT_PENDING)됐던 부스를 다시 풀어줘서
    // (RESERVED -> AVAILABLE) 다른 업체가 재신청할 수 있게 하고, 신청은 REJECTED로 되돌린다.
    // 이미 CONFIRMED/REJECTED 등 최종 상태인 건은 건드리지 않음(멱등, 결제 완료와 실패 통보가 겹쳐 와도 안전).
    public BoothApplicationGroupReleaseResponse releaseBoothApplicationGroup(String groupId, String reason) {
        BoothApplicationGroup group = boothApplicationGroupRepository.findById(groupId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "신청 그룹을 찾을 수 없습니다."));
        List<BoothApplication> applications = boothApplicationRepository.findByGroup_Id(groupId);

        String releaseReason = (reason == null || reason.isBlank()) ? "결제 기한 초과로 자동 반려되었습니다." : reason;

        List<BoothApplicationGroupReleaseResponse.Result> results = new ArrayList<>();
        for (BoothApplication application : applications) {
            if (application.getStatus() != ApplicationStatus.PAYMENT_PENDING) {
                continue; // DRAFT/SUBMITTED/REJECTED/CONFIRMED 등은 결제 실패 통보 대상이 아니므로 건드리지 않음
            }

            Booth booth = application.getBooth();
            if (booth.getStatus() == BoothStatus.RESERVED) {
                booth.release();
            }
            application.reject(releaseReason);

            results.add(new BoothApplicationGroupReleaseResponse.Result(
                    application.getId(), booth.getId(), application.getStatus()));
        }

        return new BoothApplicationGroupReleaseResponse(groupId, results);
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
                    expo.getId(), expo.getTitle(), expo.getStatus(),
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
        boolean withinApplyPeriod = isWithinApplyPeriod(expo, LocalDateTime.now());
        int availableCount = (int) allBooths.stream().filter(b -> b.getStatus() == BoothStatus.AVAILABLE).count();
        List<BoothDetail> views = allBooths.stream().map(b -> BoothDetail.of(b, withinApplyPeriod)).toList();

        return new ExpoBoothsResponse(expo.getId(), expo.getTitle(), allBooths.size(), availableCount, views);
    }

    // open 박람회 목록 페이징 조회
    @Transactional(readOnly = true)
    public Page<ExpoSummaryResponse> listOpenExpos(Pageable pageable){
        Page<Expo> openExpos = expoRepository.findByStatus(ExpoStatus.OPEN, pageable);

        return openExpos.map(ExpoSummaryResponse::from);
    }

    // 특정 박람회의 부스 목록 조회. DRAFT(비공개) 및 없는 박람회는 404
    @Transactional(readOnly = true)
    public ExpoBoothsResponse getExpoBooths(Long expoId, BoothStatus status) {
        Expo expo = expoRepository.findById(expoId)
                .filter(e -> e.getStatus() == ExpoStatus.OPEN)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "박람회를 찾을 수 없습니다."));

        List<Booth> allBooths = boothRepository.findByExpo_IdOrderByBoothNo(expoId);
        boolean withinApplyPeriod = isWithinApplyPeriod(expo, LocalDateTime.now());

        // 예약 가능 부스 수
        int availableCount = (int) allBooths.stream()
                .filter(b -> b.getStatus() == BoothStatus.AVAILABLE)
                .count();

        List<BoothDetail> views = allBooths.stream()
                .filter(b -> status == null || b.getStatus() == status)
                .map(b -> BoothDetail.of(b, withinApplyPeriod))
                .toList();

        return new ExpoBoothsResponse(expo.getId(), expo.getTitle(), allBooths.size(), availableCount, views);
    }

    // 박람회가 공개 상태이고 지금이 신청 접수 기간인지 확인
    private void validateApplicationPeriod(Expo expo) {
        if (expo.getStatus() != ExpoStatus.OPEN) {
            throw new CustomException(ErrorCode.INVALID_STATE, "공개되지 않은 박람회입니다.");
        }

        if (!isWithinApplyPeriod(expo, LocalDateTime.now())) {
            throw new CustomException(ErrorCode.INVALID_STATE, "부스 참가 신청 기간이 아닙니다.");
        }
    }

    // 신청 가능 기간 내
    private boolean isWithinApplyPeriod(Expo expo, LocalDateTime now) {
        return !now.isBefore(expo.getApplyStartsAt()) && !now.isAfter(expo.getApplyEndsAt());
    }

    // 신청하려는 부스가 이 신청 그룹이 속한 박람회의 부스가 맞는지 확인 (다른 박람회 부스 섞임 방지)
    private void validateBoothBelongsToExpo(Booth booth, Expo expo) {
        if (!booth.getExpo().getId().equals(expo.getId())) {
            throw new CustomException(ErrorCode.NOT_FOUND, "부스를 찾을 수 없습니다.");
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