package com.team4.reservation.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tickets")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "customer_id", nullable = false)
    private Long customerId; // Identity 서비스 User.id 논리 참조(FK 없음)

    @Column(name = "expo_id", nullable = false)
    private Long expoId; // Expo 서비스 논리 참조(FK 없음) — 이 티켓이 어느 박람회 방문용인지

    @Column(name = "visit_date", nullable = false)
    private LocalDate visitDate; // 방문 예약한 날짜. 같은 박람회라도 날짜가 다르면 별도 티켓(별도 QR).

    @Enumerated(EnumType.STRING)
    @Column(name = "ticket_type", nullable = false, length = 20)
    private TicketType ticketType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TicketStatus status;

    @Column(name = "qr_token", nullable = false, unique = true, length = 36)
    private String qrToken;

    @Column(name = "issued_at", nullable = false, updatable = false)
    private LocalDateTime issuedAt;

    // 체크인 이전엔 null. CheckInService의 조건부 UPDATE가 이 컬럼만 SQL 레벨에서 직접 채움.
    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    private Ticket(Long customerId, Long expoId, LocalDate visitDate, TicketType ticketType) {
        this.customerId = customerId;
        this.expoId = expoId;
        this.visitDate = visitDate;
        this.ticketType = ticketType;
        this.status = TicketStatus.ISSUED;
        this.qrToken = UUID.randomUUID().toString(); // 추측 불가능한 값 — 순차 id를 그대로 노출하지 않으려는 목적
        this.issuedAt = LocalDateTime.now();
    }

    // 방문 예약 신청 시 발급되는 무료 입장권. (customerId, expoId, visitDate) 조합당 1장만 존재해야 함
    // — 호출부(TicketService)에서 중복 발급 방지.
    public static Ticket issueFree(Long customerId, Long expoId, LocalDate visitDate) {
        return new Ticket(customerId, expoId, visitDate, TicketType.FREE);
    }

    // 당일 결제 완료 후 Payment -> Reservation 내부 호출로 발급되는 유료 입장권.
    // (customerId, expoId, visitDate) 조합당 1장만 존재해야 함 — 호출부(TicketService)에서 중복 발급 방지.
    public static Ticket issuePaid(Long customerId, Long expoId, LocalDate visitDate) {
        return new Ticket(customerId, expoId, visitDate, TicketType.PAID);
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    // 주의: markUsedIfIssued()는 JPQL 벌크 UPDATE라 영속성 컨텍스트를 거치지 않음 — 체크인으로 status가
    // 바뀌어도 이 콜백은 호출되지 않아 updated_at은 그대로임(의도된 동작).
    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
