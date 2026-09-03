package com.team4.expo.dto;

import com.team4.expo.domain.ApplicationStatus;
import com.team4.expo.domain.BoothApplication;
import com.team4.expo.domain.BoothApplicationGroup;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import lombok.Getter;

// 마이페이지(내 신청 내역) / Admin 신청 조회 공통 응답. 그룹의 공유 정보 + 부스별 상태를 함께 반환.
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

    public BoothApplicationGroupDetailResponse(String groupId, Long expoId, String expoTitle, Long exhibitorId,
                                                String exhibitionItem, String conceptDescription,
                                                boolean powerRequested, boolean waterSupplyRequested,
                                                boolean internetRequested, String additionalRequest,
                                                LocalDateTime createdAt, List<Item> applications) {
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
    }

    public static BoothApplicationGroupDetailResponse of(BoothApplicationGroup group, List<BoothApplication> applications) {
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
                applications.stream().map(Item::from).collect(Collectors.toList())
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
