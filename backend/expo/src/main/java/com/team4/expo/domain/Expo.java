package com.team4.expo.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;

// 박람회(행사) 엔티티. 1개 Expo가 여러 Booth를 가짐
@Entity
@Table(name = "expos")
@Getter
@NoArgsConstructor
public class Expo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private String venue;

    // 박람회 실제 행사 기간
    private LocalDateTime startsAt;
    private LocalDateTime endsAt;
    // 부스 참가 "신청"을 받는 기간
    private LocalDateTime applyStartsAt;
    private LocalDateTime applyEndsAt;

    @Enumerated(EnumType.STRING)
    private ExpoStatus status;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // registerExpo()에서 호출되는 생성자. 최초 등록 시 항상 DRAFT(비공개)로 시작.
    public Expo(String title, String venue, LocalDateTime startsAt, LocalDateTime endsAt,
                LocalDateTime applyStartsAt, LocalDateTime applyEndsAt) {
        this.title = title;
        this.venue = venue;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
        this.applyStartsAt = applyStartsAt;
        this.applyEndsAt = applyEndsAt;
        this.status = ExpoStatus.DRAFT;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    // 관리자가 박람회를 공개할 때 호출 (ExpoService.openExpo). DRAFT -> OPEN.
    public void open() {
        this.status = ExpoStatus.OPEN;
        this.updatedAt = LocalDateTime.now();
    }
}