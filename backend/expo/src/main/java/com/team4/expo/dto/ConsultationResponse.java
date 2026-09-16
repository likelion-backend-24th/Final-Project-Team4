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
    private final Long expoId;
    private final String expoTitle;
    private final String companyName;
    private final Long customerId;
    private final String customerName;
    private final String customerPhone;
    private final String customerEmail;
    private final boolean wantsPurchase;
    private final boolean wantsTestDrive;
    private final String interestedVehicle;
    private final boolean hasDriverLicense;
    private final LocalDate preferredDate;
    private final LocalTime preferredTime;
    private final String message;
    private final String aiSummary;
    private final boolean aiSummaryRetryable;
    private final boolean leadConsent;
    private final ConsultationStatus status;
    private final String rejectReason;
    private final LocalDateTime createdAt;
    private final boolean reviewable;

    private ConsultationResponse(Long consultationId, Long boothId, String boothNo, Long expoId, String expoTitle,
                                  String companyName,
                                  Long customerId, String customerName, String customerPhone, String customerEmail,
                                  boolean wantsPurchase, boolean wantsTestDrive, String interestedVehicle,
                                  boolean hasDriverLicense, LocalDate preferredDate, LocalTime preferredTime,
                                  String message, String aiSummary, boolean aiSummaryRetryable, boolean leadConsent,
                                  ConsultationStatus status, String rejectReason,
                                  LocalDateTime createdAt, boolean reviewable) {
        this.consultationId = consultationId;
        this.boothId = boothId;
        this.boothNo = boothNo;
        this.expoId = expoId;
        this.expoTitle = expoTitle;
        this.companyName = companyName;
        this.customerId = customerId;
        this.customerName = customerName;
        this.customerPhone = customerPhone;
        this.customerEmail = customerEmail;
        this.wantsPurchase = wantsPurchase;
        this.wantsTestDrive = wantsTestDrive;
        this.interestedVehicle = interestedVehicle;
        this.hasDriverLicense = hasDriverLicense;
        this.preferredDate = preferredDate;
        this.preferredTime = preferredTime;
        this.message = message;
        this.aiSummary = aiSummary;
        this.aiSummaryRetryable = aiSummaryRetryable;
        this.leadConsent = leadConsent;
        this.status = status;
        this.rejectReason = rejectReason;
        this.createdAt = createdAt;
        this.reviewable = reviewable;
    }

    public static ConsultationResponse from(Consultation consultation) {
        return from(consultation, null);
    }

    public static ConsultationResponse from(Consultation consultation, String companyName) {
        return new ConsultationResponse(
                consultation.getId(),
                consultation.getBooth().getId(),
                consultation.getBooth().getBoothNo(),
                consultation.getBooth().getExpo().getId(),
                consultation.getBooth().getExpo().getTitle(),
                companyName,
                consultation.getCustomerId(),
                consultation.getCustomerName(),
                consultation.getCustomerPhone(),
                consultation.getCustomerEmail(),
                consultation.isWantsPurchase(),
                consultation.isWantsTestDrive(),
                consultation.getInterestedVehicle(),
                consultation.isHasDriverLicense(),
                consultation.getPreferredDate(),
                consultation.getPreferredTime(),
                consultation.getMessage(),
                consultation.getAiSummary(),
                consultation.getAiSummary() == null && consultation.canRetryAiSummary(),
                consultation.isLeadConsent(),
                consultation.getStatus(),
                consultation.getRejectReason(),
                consultation.getCreatedAt(),
                consultation.isReviewable()
        );
    }
}
