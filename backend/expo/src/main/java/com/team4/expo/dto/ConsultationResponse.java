package com.team4.expo.dto;

import com.team4.expo.domain.Consultation;
import com.team4.expo.domain.ConsultationStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import lombok.Getter;

@Getter
public class ConsultationResponse {

    private final Long consultationId;
    private final Long boothId;
    private final String boothNo;
    private final Long vehicleId;
    private final String vehicleName;
    private final Long expoId;
    private final String expoTitle;
    private final Long customerId;
    private final boolean wantsPurchase;
    private final boolean wantsTestDrive;
    private final LocalDate preferredDate;
    private final LocalTime preferredTime;
    private final String message;
    private final ConsultationStatus status;
    private final String rejectReason;
    private final LocalDateTime createdAt;

    private ConsultationResponse(Long consultationId, Long boothId, String boothNo, Long vehicleId,
                                  String vehicleName, Long expoId, String expoTitle, Long customerId,
                                  boolean wantsPurchase, boolean wantsTestDrive, LocalDate preferredDate,
                                  LocalTime preferredTime, String message, ConsultationStatus status,
                                  String rejectReason, LocalDateTime createdAt) {
        this.consultationId = consultationId;
        this.boothId = boothId;
        this.boothNo = boothNo;
        this.vehicleId = vehicleId;
        this.vehicleName = vehicleName;
        this.expoId = expoId;
        this.expoTitle = expoTitle;
        this.customerId = customerId;
        this.wantsPurchase = wantsPurchase;
        this.wantsTestDrive = wantsTestDrive;
        this.preferredDate = preferredDate;
        this.preferredTime = preferredTime;
        this.message = message;
        this.status = status;
        this.rejectReason = rejectReason;
        this.createdAt = createdAt;
    }

    // 고객 마이페이지("예약한 상담")에서 어떤 박람회·어떤 차량에 신청한 상담인지 바로 알 수 있도록
    // boothNo/vehicleName/expoTitle까지 같이 내려준다 — id만 있으면 프론트에서 매칭할 방법이 없었음.
    public static ConsultationResponse from(Consultation consultation) {
        return new ConsultationResponse(
                consultation.getId(),
                consultation.getBooth().getId(),
                consultation.getBooth().getBoothNo(),
                consultation.getVehicle().getId(),
                consultation.getVehicle().getName(),
                consultation.getBooth().getExpo().getId(),
                consultation.getBooth().getExpo().getTitle(),
                consultation.getCustomerId(),
                consultation.isWantsPurchase(),
                consultation.isWantsTestDrive(),
                consultation.getPreferredDate(),
                consultation.getPreferredTime(),
                consultation.getMessage(),
                consultation.getStatus(),
                consultation.getRejectReason(),
                consultation.getCreatedAt()
        );
    }
}
