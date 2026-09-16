package com.team4.review.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;

// 고객이 방문 상담 완료(COMPLETED) 후 남기는 후기 1건.
// boothId/customerId는 다른 서비스(Expo/Identity) 소유 데이터의 논리 참조(FK 없음, MSA 서비스 간 DB 분리).
// boothNo는 작성 시점에 Expo에서 받아온 값을 그대로 저장(읽을 때마다 Expo를 호출하지 않기 위한 비정규화).
@Entity
@Table(name = "reviews")
@Getter
@NoArgsConstructor
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long boothId;
    private String boothNo;

    @Enumerated(EnumType.STRING)
    private ReviewType reviewType;

    private Long customerId;
    private String customerName;

    // 상담후기(CONSULT)에서만 사용 - 어떤 차량에 대한 후기인지(자유 텍스트)
    private String vehicleName;

    @Column(length = 1000)
    private String content;

    private LocalDateTime createdAt;

    public Review(Long boothId, String boothNo, ReviewType reviewType, Long customerId, String customerName,
                  String vehicleName, String content) {
        this.boothId = boothId;
        this.boothNo = boothNo;
        this.reviewType = reviewType;
        this.customerId = customerId;
        this.customerName = customerName;
        this.vehicleName = vehicleName;
        this.content = content;
        this.createdAt = LocalDateTime.now();
    }
}
