package com.team4.payment.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "admission_payments")
public class AdmissionPayment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 결제 고객
    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    // 대상 박람회
    @Column(name = "expo_id", nullable = false)
    private long expoId;

    //  포트원(거래 고유 번호)
    @Column(nullable = false, unique = true)
    private String portonePaymentId;

    // 결제 수단
    private String payMethod;

    // 결제 금액 (1일 입장료 × 선택한 날짜 수)
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

    // 츼소 또는 실패 사유
    private String cancelReason;

    // 결제 완료 후 Reservation이 날짜별로 발급한 티켓들 (둘 다 nullable — 결제 실패/취소 시엔 비어있음)
    @Builder.Default
    @OneToMany(mappedBy = "admissionPayment", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AdmissionPaymentTicket> tickets = new ArrayList<>();

    @CreationTimestamp
    @Column(updatable = false, name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // 결제 성공 처리
    public void approve(String portonePaymentId, LocalDateTime approvedAt) {
        this.status = PaymentStatus.PAID;
        this.portonePaymentId = portonePaymentId;
        this.approvedAt = approvedAt;
    }

    // 결제 실패 처리
    public void fail(String failReason) {
        this.status = PaymentStatus.FAILED;
        this.cancelReason = failReason;
    }

    public void addTicket(AdmissionPaymentTicket ticket) {
        ticket.setAdmissionPayment(this);
        this.tickets.add(ticket);
    }
}
