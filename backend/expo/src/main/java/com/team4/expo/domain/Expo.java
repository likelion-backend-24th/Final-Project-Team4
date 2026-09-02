package com.team4.expo.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;

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

    private LocalDateTime startsAt;
    private LocalDateTime endsAt;
    private LocalDateTime applyStartsAt;
    private LocalDateTime applyEndsAt;

    @Enumerated(EnumType.STRING)
    private ExpoStatus status;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

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

    public void open() {
        this.status = ExpoStatus.OPEN;
        this.updatedAt = LocalDateTime.now();
    }
}