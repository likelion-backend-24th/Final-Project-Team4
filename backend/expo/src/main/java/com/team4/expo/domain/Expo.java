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

    // 박람회 시작 이후 방문객이 내는 당일 입장료(원). Reservation이 내부 API로 조회해 Payment 결제 금액으로 씀.
    @Column(nullable = false)
    private Long admissionFee;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // registerExpo()에서 호출되는 생성자. 최초 등록 시 항상 DRAFT(비공개)로 시작.
    public Expo(String title, String venue, LocalDateTime startsAt, LocalDateTime endsAt,
                LocalDateTime applyStartsAt, LocalDateTime applyEndsAt, Long admissionFee) {
        this.title = title;
        this.venue = venue;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
        this.applyStartsAt = applyStartsAt;
        this.applyEndsAt = applyEndsAt;
        this.status = ExpoStatus.DRAFT;
        this.admissionFee = admissionFee;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    // 당일 입장료를 신경 안 쓰는 기존 호출부(테스트 등) 호환용 — 미지정 시 0원.
    public Expo(String title, String venue, LocalDateTime startsAt, LocalDateTime endsAt,
                LocalDateTime applyStartsAt, LocalDateTime applyEndsAt) {
        this(title, venue, startsAt, endsAt, applyStartsAt, applyEndsAt, 0L);
    }

    // 관리자가 박람회를 공개할 때 호출 (ExpoService.openExpo). DRAFT -> OPEN.
    public void open() {
        this.status = ExpoStatus.OPEN;
        this.updatedAt = LocalDateTime.now();
    }
}
