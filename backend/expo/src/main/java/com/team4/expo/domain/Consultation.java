package com.team4.expo.domain;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import lombok.Getter;
import lombok.NoArgsConstructor;

// 고객의 차량 구매/시승 상담 신청 1건. customerId는 Identity 서비스 논리 참조(FK 없음).
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id")
    private Vehicle vehicle;

    private Long customerId;

    private boolean wantsPurchase;
    private boolean wantsTestDrive;

    private LocalDate preferredDate;
    private LocalTime preferredTime;

    @Column(length = 1000)
    private String message;

    @Enumerated(EnumType.STRING)
    private ConsultationStatus status;

    @Column(length = 500)
    private String rejectReason;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Consultation(Booth booth, Vehicle vehicle, Long customerId, boolean wantsPurchase, boolean wantsTestDrive,
                         LocalDate preferredDate, LocalTime preferredTime, String message) {
        this.booth = booth;
        this.vehicle = vehicle;
        this.customerId = customerId;
        this.wantsPurchase = wantsPurchase;
        this.wantsTestDrive = wantsTestDrive;
        this.preferredDate = preferredDate;
        this.preferredTime = preferredTime;
        this.message = message;
        this.status = ConsultationStatus.REQUESTED;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
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
}
