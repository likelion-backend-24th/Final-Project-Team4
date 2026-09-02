package com.team4.payment.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * 부스 참가비 결제 정보
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "payments")
public class Payment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Booking 엔티티 참조 대신, ID만 보관 (다른 서비스 소유 데이터라서)
    // 중복 방지, unique 제약으로 예약 1건당 결제 1건만 존재하도록 강제
    @Column(name = "booking_id", nullable = false, unique = true)
    private Long bookingId;

    // 결제한 참가 업체
    @Column(name = "user_id", nullable = false)
    private Long userId;

    // 박람회 Id
    @Column(name = "expo_id", nullable = false)
    private Long expoId;

    // 부스
    @Column(name = "booth_id", nullable = false)
    private Long boothId;

    // 포트원 거래 고유 번호
    @Column(nullable = false, unique = true)
    private String portonePaymentId;

    // 결제 수단
    private String payMethod;

    // 결제 금액
    @Column(nullable = false)
    private Long amount;

    // 결제 상태
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus status;

    // 결제 승인(완료) 시간
    private LocalDateTime approvedAt;

    // 결제 취소 처리된 시간
    private LocalDateTime cancelledAt;

    // 취소 또는 실패 사유
    private String cancelReason;

    @CreationTimestamp
    @Column(updatable = false, name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // 결제 성공 처리.
    public void approve(String portonePaymentId, LocalDateTime approvedAt){
        this.status = PaymentStatus.PAID;
        // PG(또는 MOCK) 거래 고유 번호
        this.portonePaymentId = portonePaymentId;
        // 결제 승인 시각
        this.approvedAt = approvedAt;
    }

    // 결제 취소 처리
    public void cancel(String cancelReason, LocalDateTime cancelledAt) {
        this.status = PaymentStatus.CANCELLED;
        // 취소 사유
        this.cancelReason = cancelReason;
        // 취소 처리 시간
        this.cancelledAt = cancelledAt;
    }

    // 결제 실패 처리
    public void fail(String failReason){
        this.status = PaymentStatus.FAILED;
        // 실패 사유
        this.cancelReason = failReason;
    }
}