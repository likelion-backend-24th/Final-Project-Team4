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
}