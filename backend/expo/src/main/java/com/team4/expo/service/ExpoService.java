package com.team4.expo.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.expo.domain.*;
import com.team4.expo.dto.*;
import com.team4.expo.repository.BoothApplicationRepository;
import com.team4.expo.repository.BoothRepository;
import com.team4.expo.repository.ExpoRepository;
import java.time.LocalDateTime;
import java.util.List;
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

    public ExpoService(ExpoRepository expoRepository, BoothRepository boothRepository,
                        BoothApplicationRepository boothApplicationRepository,
                        BoothApplicationValidator validator) {
        this.expoRepository = expoRepository;
        this.boothRepository = boothRepository;
        this.boothApplicationRepository = boothApplicationRepository;
        this.validator = validator;
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
        boolean withinApplyPeriod = validator.isWithinApplyPeriod(expo, LocalDateTime.now());
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
        boolean withinApplyPeriod = validator.isWithinApplyPeriod(expo, LocalDateTime.now());

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

    // 결제 서비스 등에서 신청 그룹 단건 상세를 조회할 때 사용
    @Transactional(readOnly = true)
    public BoothApplicationGroupDetailResponse getBoothApplicationGroupDetail(Long exhibitorId, String groupId){
        BoothApplicationGroup group = boothApplicationRepository.findById(groupId)
                .orElseThrow(() new -> new CustomException(ErrorCode.NOT_FOUND, "신청 그룹을 찾을 수 없습니다."));
        validateGroupOwnership(group, exhibitorId);

        List<BoothApplication> applications = boothApplicationRepository.findByGroup_Id(groupId);
        return BoothApplicationGroupDetailResponse.of(group. applications);
    }
}
