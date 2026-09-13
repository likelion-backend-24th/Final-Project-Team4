package com.team4.expo.domain;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import lombok.Getter;
import lombok.NoArgsConstructor;

// 고객의 참가업체 상담 신청 1건. customerId는 Identity 서비스 논리 참조(FK 없음).
@Entity
@Table(name = "consultations")
@Getter
@NoArgsConstructor
public class Consultation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booth_id")
    private Booth booth;

    private Long customerId;

    private String customerName;
    private String customerPhone;
    private String customerEmail;

    private boolean wantsPurchase;
    private boolean wantsTestDrive;

    private String interestedVehicle;
    private boolean hasDriverLicense;

    private LocalDate preferredDate;
    private LocalTime preferredTime;

    @Column(length = 1000)
    private String message;

    @Column(length = 1000)
    private String aiSummary;

    @Enumerated(EnumType.STRING)
    private ConsultationStatus status;

    @Column(length = 500)
    private String rejectReason;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Consultation(Booth booth, Long customerId, String customerName, String customerPhone,
                         String customerEmail, boolean wantsPurchase, boolean wantsTestDrive,
                         String interestedVehicle, boolean hasDriverLicense,
                         LocalDate preferredDate, LocalTime preferredTime, String message) {
        this.booth = booth;
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
        this.status = ConsultationStatus.REQUESTED;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    // ConsultationService.applyConsultation()에서 Gemini 요약 응답을 받은 뒤 붙인다. 실패 시 null로 남는다(부가 기능).
    public void attachAiSummary(String aiSummary) {
        this.aiSummary = aiSummary;
    }

    // ConsultationReviewService.approveConsultation()에서 호출. REQUESTED -> APPROVED(서비스 레이어에서 상태 검증).
    public void approve() {
        this.status = ConsultationStatus.APPROVED;
        this.updatedAt = LocalDateTime.now();
    }

    // ConsultationReviewService.rejectConsultation()에서 호출. REQUESTED -> REJECTED(서비스 레이어에서 상태 검증).
    public void reject(String reason) {
        this.status = ConsultationStatus.REJECTED;
        this.rejectReason = reason;
        this.updatedAt = LocalDateTime.now();
    }

    // ConsultationService.cancelConsultation()에서 호출. REQUESTED -> CANCELED(서비스 레이어에서 상태 검증).
    public void cancel() {
        this.status = ConsultationStatus.CANCELED;
        this.updatedAt = LocalDateTime.now();
    }

    // ConsultationReviewService.completeConsultation()에서 호출. APPROVED -> COMPLETED(서비스 레이어에서 상태·날짜 검증).
    public void complete() {
        this.status = ConsultationStatus.COMPLETED;
        this.updatedAt = LocalDateTime.now();
    }

    // ConsultationReviewService.markNoShow()에서 호출. APPROVED -> NO_SHOW(서비스 레이어에서 상태·날짜 검증).
    public void markNoShow() {
        this.status = ConsultationStatus.NO_SHOW;
        this.updatedAt = LocalDateTime.now();
    }

    // ConsultationService.updateConsultation()에서 호출. REQUESTED 상태에서만 내용 수정 가능(서비스 레이어에서 검증).
    // 수정 후에는 기존 AI 요약이 더 이상 내용과 맞지 않으므로 서비스가 다시 붙여준다.
    public void updateDetails(boolean wantsPurchase, boolean wantsTestDrive, String interestedVehicle,
                               boolean hasDriverLicense, LocalDate preferredDate, LocalTime preferredTime,
                               String message) {
        this.wantsPurchase = wantsPurchase;
        this.wantsTestDrive = wantsTestDrive;
        this.interestedVehicle = interestedVehicle;
        this.hasDriverLicense = hasDriverLicense;
        this.preferredDate = preferredDate;
        this.preferredTime = preferredTime;
        this.message = message;
        this.aiSummary = null;
        this.updatedAt = LocalDateTime.now();
    }
}
