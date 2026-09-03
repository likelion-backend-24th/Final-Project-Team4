package com.team4.payment.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "payment_items")
public class PaymentItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name= "payment_id", nullable = false)
    private Payment payment;

    // 어떤 부스에 대한 항목인지
    @Column(name = "booth_id", nullable = false)
    private Long boothId;

    // 이 부스 1건의 참가비
    @Column(nullable = false)
    private Long amount;
}
