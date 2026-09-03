package com.team4.expo.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

// 개별 부스 엔티티.
@Entity
@Table(name = "booths")
@Getter
@NoArgsConstructor
public class Booth {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expo_id")
    private Expo expo;

    private String boothNo;
    private String type;
    private Integer fee;

    @Enumerated(EnumType.STRING)
    private BoothStatus status;

    private String bannerImageUrl;

    public Booth(Expo expo, String boothNo, String type, Integer fee) {
        this.expo = expo;
        this.boothNo = boothNo;
        this.type = type;
        this.fee = fee;
        this.status = BoothStatus.AVAILABLE;
    }

    public void updateBannerImage(String bannerImageUrl) {
        this.bannerImageUrl = bannerImageUrl;
    }

    // ExpoService.approveBoothApplication()에서 호출. AVAILABLE -> RESERVED로 잠가서
    // 관리자 승인~결제 완료 사이에 다른 업체가 같은 부스에 신청하지 못하게 막는다.
    public void reserve() {
        this.status = BoothStatus.RESERVED;
    }

    // ExpoService.confirmBoothApplicationGroup()에서 결제 완료 확인 후 호출. RESERVED -> ASSIGNED(최종 확정).
    public void assign() {
        this.status = BoothStatus.ASSIGNED;
    }

    // ExpoService.releaseBoothApplicationGroup()에서 결제 실패/시간초과 시 호출. RESERVED -> AVAILABLE(잠금 해제).
    public void release() {
        this.status = BoothStatus.AVAILABLE;
    }
}