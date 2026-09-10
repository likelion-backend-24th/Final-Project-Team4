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
    private final Long vehicleId;
    private final Long customerId;
    private final boolean wantsPurchase;
    private final boolean wantsTestDrive;
    private final LocalDate preferredDate;
    private final LocalTime preferredTime;
    private final String message;
    private final ConsultationStatus status;
    private final String rejectReason;
    private final LocalDateTime createdAt;

    private ConsultationResponse(Long consultationId, Long boothId, Long vehicleId, Long customerId,
                                  boolean wantsPurchase, boolean wantsTestDrive, LocalDate preferredDate,
                                  LocalTime preferredTime, String message, ConsultationStatus status,
                                  String rejectReason, LocalDateTime createdAt) {
        this.consultationId = consultationId;
        this.boothId = boothId;
        this.vehicleId = vehicleId;
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

    public static ConsultationResponse from(Consultation consultation) {
        return new ConsultationResponse(
                consultation.getId(),
                consultation.getBooth().getId(),
                consultation.getVehicle().getId(),
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
