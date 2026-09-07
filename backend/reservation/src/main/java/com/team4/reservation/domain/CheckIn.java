package com.team4.reservation.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "check_ins")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CheckIn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ticket_id", nullable = false)
    private Long ticketId;

    @Column(name = "expo_id", nullable = false)
    private Long expoId; // 어느 박람회에서 찍었는지 기록용

    @Column(name = "checked_in_at", nullable = false)
    private LocalDateTime checkedInAt;

    public CheckIn(Long ticketId, Long expoId, LocalDateTime checkedInAt) {
        this.ticketId = ticketId;
        this.expoId = expoId;
        this.checkedInAt = checkedInAt;
    }
}
