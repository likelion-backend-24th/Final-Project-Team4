package com.team4.expo.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;

// 참가업체의 부스 참가 신청 1건.
@Entity
@Table(name = "booth_applications")
@Getter
@NoArgsConstructor
public class BoothApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 어떤 부스에 신청했는지.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booth_id")
    private Booth booth;

    private Long exhibitorId;

    // 신청 시점에 입력받은 전시 관련 정보 (Figma "부스 참가 신청" 화면 기준)
    private String exhibitionItem;
    private String conceptDescription;
    private boolean powerRequested;
    private boolean waterSupplyRequested;
    private boolean internetRequested;
    private String additionalRequest;

    @Enumerated(EnumType.STRING)
    private ApplicationStatus status;

    // 반려 시 사유 기록용.
    private String rejectReason;

    private LocalDateTime submittedAt;

    // ExpoService.applyBooth()에서 호출. 신청 즉시 SUBMITTED(접수) 상태로 생성됨.
    public BoothApplication(Booth booth, Long exhibitorId, String exhibitionItem,
                            String conceptDescription, boolean powerRequested,
                            boolean waterSupplyRequested, boolean internetRequested,
                            String additionalRequest) {
        this.booth = booth;
        this.exhibitorId = exhibitorId;
        this.exhibitionItem = exhibitionItem;
        this.conceptDescription = conceptDescription;
        this.powerRequested = powerRequested;
        this.waterSupplyRequested = waterSupplyRequested;
        this.internetRequested = internetRequested;
        this.additionalRequest = additionalRequest;
        this.status = ApplicationStatus.SUBMITTED;
        this.submittedAt = LocalDateTime.now();
    }
}
