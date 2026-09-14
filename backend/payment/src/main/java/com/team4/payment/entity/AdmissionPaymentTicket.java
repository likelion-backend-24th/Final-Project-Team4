package com.team4.payment.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

// 결제 1건(AdmissionPayment)에 딸린 날짜별 발급 티켓. 결제 시 여러 날짜를 한 번에 선택하면
// 그 수만큼 이 엔티티가 생겨 결제-티켓이 1:N으로 묶인다.
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "admission_payment_tickets")
public class AdmissionPaymentTicket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admission_payment_id", nullable = false)
    private AdmissionPayment admissionPayment;

    @Column(name = "visit_date", nullable = false)
    private LocalDate visitDate;

    // Reservation 서비스 Ticket.id 논리 참조(FK 없음)
    @Column(name = "ticket_id", nullable = false)
    private Long ticketId;

    @Column(name = "qr_token", nullable = false)
    private String qrToken;

    // QR 이미지는 저장하지 않고 결제 응답에만 실어 보냄(Reservation의 qrToken으로 언제든 다시 그릴 수 있음)
    @Transient
    private String qrImageBase64;

    // 이 날짜 1건분 결제 금액(구매 시점 1일 입장료 스냅샷). 환불 금액 계산·결제 내역 표시에 그대로 쓴다 —
    // 나중에 입장료가 바뀌어도 이미 산 티켓의 금액은 구매 당시 값 그대로여야 하므로 매번 다시 계산하지 않음.
    @Column(nullable = false)
    private Long amount;

    // 환불 처리된 시각. null이면 아직 환불 전(정상 사용 가능).
    @Column(name = "refunded_at")
    private LocalDateTime refundedAt;

    // 환불 사유(고객이 환불 신청 시 선택/입력).
    @Column(name = "refund_reason", length = 200)
    private String refundReason;

    public boolean isRefunded() {
        return refundedAt != null;
    }

    // AdmissionPaymentService.refundTicket()에서 호출. 이 시점 이전에 이미 Reservation 쪽 QR을
    // 먼저 무효화(CANCELLED)하고, 포트원 결제 취소까지 성공한 뒤에만 호출해야 한다 — 순서가 바뀌면
    // "환불은 기록됐는데 QR은 아직 살아있는" 상태가 생길 수 있다.
    public void markRefunded(String reason, LocalDateTime refundedAt) {
        this.refundReason = reason;
        this.refundedAt = refundedAt;
    }
}
