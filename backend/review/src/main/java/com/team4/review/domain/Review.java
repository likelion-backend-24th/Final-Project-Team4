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

    // 작성 시점의 업체명/박람회명 스냅샷(마이페이지 표시용). 이 기능 도입 전 후기는 null.
    private String companyName;
    private String expoTitle;

    @Enumerated(EnumType.STRING)
    private ReviewType reviewType;

    private Long customerId;
    private String customerName;

    // 상담후기(CONSULT)에서만 사용 - 어떤 차량에 대한 후기인지(자유 텍스트)
    private String vehicleName;

    // 상담후기(CONSULT)에서만 사용 - 어느 상담(Expo 소유, 논리 참조)에 대한 후기인지. 상담 1건당 후기 1개.
    private Long consultationId;

    @Column(length = 1000)
    private String content;

    private LocalDateTime createdAt;

    public Review(Long boothId, String boothNo, String companyName, String expoTitle, ReviewType reviewType,
                  Long customerId, String customerName, String vehicleName, Long consultationId, String content) {
        this.boothId = boothId;
        this.boothNo = boothNo;
        this.companyName = companyName;
        this.expoTitle = expoTitle;
        this.reviewType = reviewType;
        this.customerId = customerId;
        this.customerName = customerName;
        this.vehicleName = vehicleName;
        this.consultationId = consultationId;
        this.content = content;
        this.createdAt = LocalDateTime.now();
    }

    // 후기 유형(상담/부스)과 부스는 바꿀 수 없고, 내용과(상담후기의) 차량명만 수정한다.
    public void update(String vehicleName, String content) {
        this.vehicleName = vehicleName;
        this.content = content;
    }
}
