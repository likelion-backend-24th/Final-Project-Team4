package com.team4.payment.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

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
}
