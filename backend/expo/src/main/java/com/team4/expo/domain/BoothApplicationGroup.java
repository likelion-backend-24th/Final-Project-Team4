package com.team4.expo.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;

// 참가업체가 한 번에 신청한 부스 묶음.
// 다중 부스 선택 시 공유되는 입력 정보 (전시 품목, 컨셉 설명, 부대시설, 추가요청)를 1행에 저장
// 부스별 심사 상태는 BoothApplication이 각자 독립적으로 관리(그룹이 심사 상태를 갖지 않음).
@Entity
@Table(name = "booth_application_groups")
@Getter
@NoArgsConstructor
public class BoothApplicationGroup {

    @Id
    private String id;

    // 박람회 ID
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expo_id")
    private Expo expo;

    // 참가업체 ID
    private Long exhibitorId;

    private String exhibitionItem;        //전시 품목
    private String conceptDescription;    //전시 컨셉
    // 부대시설 요청 여부
    private boolean powerRequested;       //전기
    private boolean waterSupplyRequested; //수도/배수
    private boolean internetRequested;    //인터넷선
    private String additionalRequest;     //추가 요청사항

    private LocalDateTime createdAt;

    public BoothApplicationGroup(Expo expo, Long exhibitorId, String exhibitionItem,
                                  String conceptDescription, boolean powerRequested,
                                  boolean waterSupplyRequested, boolean internetRequested,
                                  String additionalRequest) {
        this.id = UUID.randomUUID().toString();
        this.expo = expo;
        this.exhibitorId = exhibitorId;
        this.exhibitionItem = exhibitionItem;
        this.conceptDescription = conceptDescription;
        this.powerRequested = powerRequested;
        this.waterSupplyRequested = waterSupplyRequested;
        this.internetRequested = internetRequested;
        this.additionalRequest = additionalRequest;
        this.createdAt = LocalDateTime.now();
    }

    // updateBoothApplicationDraft()에서 호출. DRAFT 상태인 그룹만 이 메서드를 타야 함(서비스 레이어에서 검증).
    public void updateContent(String exhibitionItem, String conceptDescription, boolean powerRequested,
                               boolean waterSupplyRequested, boolean internetRequested, String additionalRequest) {
        this.exhibitionItem = exhibitionItem;
        this.conceptDescription = conceptDescription;
        this.powerRequested = powerRequested;
        this.waterSupplyRequested = waterSupplyRequested;
        this.internetRequested = internetRequested;
        this.additionalRequest = additionalRequest;
    }
}
