package com.team4.expo.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.expo.domain.ApplicationStatus;
import com.team4.expo.domain.Booth;
import com.team4.expo.domain.BoothApplication;
import com.team4.expo.domain.BoothApplicationGroup;
import com.team4.expo.domain.Expo;
import com.team4.expo.dto.BoothApplicationDraftUpdateRequest;
import com.team4.expo.dto.BoothApplicationGroupCancelResponse;
import com.team4.expo.dto.BoothApplicationGroupDetailResponse;
import com.team4.expo.dto.BoothApplicationGroupResponse;
import com.team4.expo.dto.BoothApplicationRequest;
import com.team4.expo.repository.BoothApplicationGroupRepository;
import com.team4.expo.repository.BoothApplicationRepository;
import com.team4.expo.repository.BoothRepository;
import com.team4.expo.repository.ExpoRepository;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 참가업체의 부스 참가 신청(그룹) 생성·수정·제출·취소·조회. 승인/반려는 BoothApplicationReviewService,
// 결제 연동은 BoothApplicationPaymentService가 담당.
@Service
@Transactional
public class BoothApplicationService {

    private final ExpoRepository expoRepository;
    private final BoothRepository boothRepository;
    private final BoothApplicationRepository boothApplicationRepository;
    private final BoothApplicationGroupRepository boothApplicationGroupRepository;
    private final BoothApplicationValidator validator;

    public BoothApplicationService(ExpoRepository expoRepository, BoothRepository boothRepository,
                                    BoothApplicationRepository boothApplicationRepository,
                                    BoothApplicationGroupRepository boothApplicationGroupRepository,
                                    BoothApplicationValidator validator) {
        this.expoRepository = expoRepository;
        this.boothRepository = boothRepository;
        this.boothApplicationRepository = boothApplicationRepository;
        this.boothApplicationGroupRepository = boothApplicationGroupRepository;
        this.validator = validator;
    }

    // 참가업체가 부스 하나 이상을 골라 그룹으로 신청 (다중 선택). saveMode=SUBMIT이면 검증 후 SUBMITTED,
    // DRAFT면 검증 없이 임시저장. 검증 실패 시 그룹 전체가 롤백됨(부분 제출 불허, 2026-09-03 확정).
    public BoothApplicationGroupResponse applyBooth(Long exhibitorId, BoothApplicationRequest request) {
        Expo expo = expoRepository.findById(request.getExpoId())
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "박람회를 찾을 수 없습니다."));

        boolean isSubmit = request.getSaveMode() == BoothApplicationRequest.SaveMode.SUBMIT;
        if (isSubmit) {
            validator.validateApplicationPeriod(expo);
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
            validator.validateBoothBelongsToExpo(booth, expo);

            ApplicationStatus status;
            if (isSubmit) {
                validator.validateBoothAvailable(booth);
                validator.validateNoDuplicateApplication(booth.getId(), exhibitorId);
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
        validator.validateGroupOwnership(group, exhibitorId);

        List<BoothApplication> existing = boothApplicationRepository.findByGroup_Id(groupId);
        validator.validateAllDraft(existing);

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
            validator.validateBoothBelongsToExpo(booth, group.getExpo());
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
        validator.validateGroupOwnership(group, exhibitorId);

        List<BoothApplication> applications = boothApplicationRepository.findByGroup_Id(groupId);
        validator.validateAllDraft(applications);

        validator.validateApplicationPeriod(group.getExpo());

        for (BoothApplication application : applications) {
            validator.validateBoothAvailable(application.getBooth());
            validator.validateNoDuplicateApplication(application.getBooth().getId(), exhibitorId);
        }
        applications.forEach(BoothApplication::submit);

        return BoothApplicationGroupResponse.from(groupId, applications);
    }

    // 신청 취소. 결제 대기·확정 건이 하나라도 있으면 취소 불가(환불 절차를 타야 함).
    public BoothApplicationGroupCancelResponse deleteBoothApplicationGroup(Long exhibitorId, String groupId) {
        BoothApplicationGroup group = boothApplicationGroupRepository.findById(groupId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "신청 그룹을 찾을 수 없습니다."));
        validator.validateGroupOwnership(group, exhibitorId);

        List<BoothApplication> applications = boothApplicationRepository.findByGroup_Id(groupId);
        boolean hasPaymentInProgress = applications.stream().anyMatch(a ->
                a.getStatus() == ApplicationStatus.PAYMENT_PENDING || a.getStatus() == ApplicationStatus.CONFIRMED);
        if (hasPaymentInProgress) {
            throw new CustomException(ErrorCode.INVALID_STATE, "결제 진행 중이거나 확정된 신청은 취소할 수 없습니다.");
        }

        applications.forEach(BoothApplication::cancel);

        return new BoothApplicationGroupCancelResponse(groupId, ApplicationStatus.CANCELLED.name());
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
}
