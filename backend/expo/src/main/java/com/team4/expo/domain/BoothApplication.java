package com.team4.expo.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;

// 참가업체의 부스 참가 신청 1건 (부스 1개 = 행 1개).
// 신청 입력 정보(전시 품목 등)는 BoothApplicationGroup이 소유
// 부스별로 독립적인 심사 상태만 관리 - 그룹 안에서 부스마다 승인/반려가 갈릴 수 있기 때문.
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

    // 어떤 신청 그룹(다중 부스 선택 묶음)에 속하는지.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    private BoothApplicationGroup group;

    // 참가업체 ID
    private Long exhibitorId;

    @Enumerated(EnumType.STRING)
    private ApplicationStatus status;

    // 반려 시 사유 기록용.
    private String rejectReason;

    private LocalDateTime submittedAt;

    // ExpoService.applyBooth()에서 호출. saveMode에 따라 DRAFT 또는 SUBMITTED로 생성됨.
    public BoothApplication(Booth booth, BoothApplicationGroup group, Long exhibitorId, ApplicationStatus status) {
        this.booth = booth;
        this.group = group;
        this.exhibitorId = exhibitorId;
        this.status = status;
        this.submittedAt = LocalDateTime.now();
    }

    // submitBoothApplicationDraft()에서 DRAFT -> SUBMITTED 전환 시 호출.
    public void submit() {
        this.status = ApplicationStatus.SUBMITTED;
        this.submittedAt = LocalDateTime.now();
    }

    // deleteBoothApplicationGroup()에서 호출. DRAFT/SUBMITTED 상태만 취소 가능(서비스 레이어에서 검증).
    public void cancel() {
        this.status = ApplicationStatus.CANCELLED;
    }
}
