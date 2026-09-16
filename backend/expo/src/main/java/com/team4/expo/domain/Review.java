package com.team4.expo.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;

// 고객이 방문 상담 완료(COMPLETED) 후 남기는 후기 1건. customerId는 Identity 서비스 논리 참조(FK 없음).
@Entity
@Table(name = "reviews")
@Getter
@NoArgsConstructor
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booth_id")
    private Booth booth;

    @Enumerated(EnumType.STRING)
    private ReviewType reviewType;

    private Long customerId;
    private String customerName;

    // 상담후기(CONSULT)에서만 사용 - 어떤 차량에 대한 후기인지(자유 텍스트, interestedVehicle과 같은 방식)
    private String vehicleName;

    @Column(length = 1000)
    private String content;

    private LocalDateTime createdAt;

    public Review(Booth booth, ReviewType reviewType, Long customerId, String customerName,
                  String vehicleName, String content) {
        this.booth = booth;
        this.reviewType = reviewType;
        this.customerId = customerId;
        this.customerName = customerName;
        this.vehicleName = vehicleName;
        this.content = content;
        this.createdAt = LocalDateTime.now();
    }
}
