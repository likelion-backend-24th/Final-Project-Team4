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

    private int aiSummaryRetryCount;

    // 참가업체가 현장에서 QR 스캔으로 연락처를 확보하는 데 동의하는지(STORY 11 리드 기능용). 기본 false.
    private boolean leadConsent;

    @Enumerated(EnumType.STRING)
    private ConsultationStatus status;

    @Column(length = 500)
    private String rejectReason;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Consultation(Booth booth, Long customerId, String customerName, String customerPhone,
                         String customerEmail, boolean wantsPurchase, boolean wantsTestDrive,
                         String interestedVehicle, boolean hasDriverLicense,
                         LocalDate preferredDate, LocalTime preferredTime, String message,
                         boolean leadConsent) {
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
        this.leadConsent = leadConsent;
        this.status = ConsultationStatus.REQUESTED;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    // ConsultationService.applyConsultation()에서 Gemini 요약 응답을 받은 뒤 붙인다. 실패 시 null로 남는다(부가 기능).
    public void attachAiSummary(String aiSummary) {
        this.aiSummary = aiSummary;
    }

    public static final int MAX_AI_SUMMARY_RETRY = 3;

    public boolean canRetryAiSummary() {
        return aiSummaryRetryCount < MAX_AI_SUMMARY_RETRY;
    }

    // ConsultationReviewService.regenerateAiSummary()에서 참가업체가 수동으로 재시도할 때 호출. 실패해도 횟수는 차감(남용 방지).
    public void incrementAiSummaryRetryCount() {
        this.aiSummaryRetryCount++;
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

    public static final int REVIEWABLE_DAYS = 5;

    // 후기(TASK 부스 후기) 작성 가능 여부 - 상담 완료 후 5일 이내(2026-09-16 확정). 완료 시각은 별도 필드 없이
    // complete()가 갱신하는 updatedAt을 그대로 쓴다(다른 상태 전이도 전부 이 필드 하나로 "마지막 전이 시각"을 표현).
    public boolean isReviewable() {
        return status == ConsultationStatus.COMPLETED && LocalDateTime.now().isBefore(reviewDeadline());
    }

    // 후기를 쓸 수 있는 마지막 시각(이 시각 전까지).
    public LocalDateTime reviewDeadline() {
        return updatedAt.plusDays(REVIEWABLE_DAYS);
    }

    // ConsultationService.updateConsultation()에서 호출. REQUESTED 상태에서만 내용 수정 가능(서비스 레이어에서 검증).
    // 수정 후에는 기존 AI 요약이 더 이상 내용과 맞지 않으므로 서비스가 다시 붙여준다.
    public void updateDetails(boolean wantsPurchase, boolean wantsTestDrive, String interestedVehicle,
                               boolean hasDriverLicense, LocalDate preferredDate, LocalTime preferredTime,
                               String message, boolean leadConsent) {
        this.wantsPurchase = wantsPurchase;
        this.wantsTestDrive = wantsTestDrive;
        this.interestedVehicle = interestedVehicle;
        this.hasDriverLicense = hasDriverLicense;
        this.preferredDate = preferredDate;
        this.preferredTime = preferredTime;
        this.message = message;
        this.leadConsent = leadConsent;
        this.aiSummary = null;
        this.updatedAt = LocalDateTime.now();
    }
}
