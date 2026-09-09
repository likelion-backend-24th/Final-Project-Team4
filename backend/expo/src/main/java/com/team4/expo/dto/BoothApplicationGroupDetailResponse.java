package com.team4.expo.dto;

import com.team4.expo.domain.ApplicationStatus;
import com.team4.expo.domain.BoothApplication;
import com.team4.expo.domain.BoothApplicationGroup;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import lombok.Getter;

// 마이페이지(내 신청 내역) / Admin 신청 조회 공통 응답. 그룹의 공유 정보 + 부스별 상태 + 결제 상태를 함께 반환.
@Getter
public class BoothApplicationGroupDetailResponse {

    private final String groupId;
    private final Long expoId;
    private final String expoTitle;
    private final Long exhibitorId;
    private final String exhibitionItem;
    private final String conceptDescription;
    private final boolean powerRequested;
    private final boolean waterSupplyRequested;
    private final boolean internetRequested;
    private final String additionalRequest;
    private final LocalDateTime createdAt;
    private final List<Item> applications;
    private final String paymentStatus; // Payment 서비스 결제 상태(PENDING/PAID/FAILED/CANCELLED). 결제 이력 없으면 null.

    // 아래 4개는 Identity에서 조회한 참가업체 대표 정보 (Admin 참가 신청 심사 화면의 "신청 업체 대표 정보" 카드용).
    // 본인 조회(마이페이지 등)에서는 이미 아는 정보라 채우지 않음 — 이 경우 전부 null.
    private final String companyName;
    private final String businessNumber;
    private final String ceoName;
    private final String managerEmail;

    public BoothApplicationGroupDetailResponse(String groupId, Long expoId, String expoTitle, Long exhibitorId,
                                               String exhibitionItem, String conceptDescription,
                                               boolean powerRequested, boolean waterSupplyRequested,
                                               boolean internetRequested, String additionalRequest,
                                               LocalDateTime createdAt, List<Item> applications,
                                               String paymentStatus, String companyName, String businessNumber,
                                               String ceoName, String managerEmail) {
        this.groupId = groupId;
        this.expoId = expoId;
        this.expoTitle = expoTitle;
        this.exhibitorId = exhibitorId;
        this.exhibitionItem = exhibitionItem;
        this.conceptDescription = conceptDescription;
        this.powerRequested = powerRequested;
        this.waterSupplyRequested = waterSupplyRequested;
        this.internetRequested = internetRequested;
        this.additionalRequest = additionalRequest;
        this.createdAt = createdAt;
        this.applications = applications;
        this.paymentStatus = paymentStatus;
        this.companyName = companyName;
        this.businessNumber = businessNumber;
        this.ceoName = ceoName;
        this.managerEmail = managerEmail;
    }

    // 참가업체 정보 없이 호출하는 기존 호출부(마이페이지 등, 본인 정보라 불필요)용 - 4개 필드는 null
    public static BoothApplicationGroupDetailResponse of(BoothApplicationGroup group, List<BoothApplication> applications) {
        return of(group, applications, null, null, null, null, null);
    }

    public static BoothApplicationGroupDetailResponse of(BoothApplicationGroup group, List<BoothApplication> applications, String paymentStatus) {
        return of(group, applications, paymentStatus, null, null, null, null);
    }

    // Admin 참가 신청 심사 화면("신청 업체 대표 정보")에서 씀 — Identity에서 조회한 참가업체 프로필을 함께 채움.
    public static BoothApplicationGroupDetailResponse of(BoothApplicationGroup group, List<BoothApplication> applications,
                                                         String paymentStatus, String companyName, String businessNumber,
                                                         String ceoName, String managerEmail) {
        return new BoothApplicationGroupDetailResponse(
                group.getId(),
                group.getExpo().getId(),
                group.getExpo().getTitle(),
                group.getExhibitorId(),
                group.getExhibitionItem(),
                group.getConceptDescription(),
                group.isPowerRequested(),
                group.isWaterSupplyRequested(),
                group.isInternetRequested(),
                group.getAdditionalRequest(),
                group.getCreatedAt(),
                applications.stream().map(Item::from).collect(Collectors.toList()),
                paymentStatus,
                companyName,
                businessNumber,
                ceoName,
                managerEmail
        );
    }

    @Getter
    public static class Item {
        private final Long applicationId;
        private final Long boothId;
        private final String boothNo;
        private final String boothType;
        private final Integer fee;
        private final ApplicationStatus status;
        private final String rejectReason;
        private final LocalDateTime submittedAt;

        public Item(Long applicationId, Long boothId, String boothNo, String boothType, Integer fee,
                    ApplicationStatus status, String rejectReason, LocalDateTime submittedAt) {
            this.applicationId = applicationId;
            this.boothId = boothId;
            this.boothNo = boothNo;
            this.boothType = boothType;
            this.fee = fee;
            this.status = status;
            this.rejectReason = rejectReason;
            this.submittedAt = submittedAt;
        }

        public static Item from(BoothApplication application) {
            return new Item(
                    application.getId(),
                    application.getBooth().getId(),
                    application.getBooth().getBoothNo(),
                    application.getBooth().getType(),
                    application.getBooth().getFee(),
                    application.getStatus(),
                    application.getRejectReason(),
                    application.getSubmittedAt()
            );
        }
    }
}