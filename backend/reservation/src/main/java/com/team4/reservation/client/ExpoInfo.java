package com.team4.reservation.client;

import java.time.LocalDateTime;

// Expo의 /internal/expo/expos/{id} 응답을 옮겨 담는 값 객체. Reservation 안에서만 쓰는 최소 정보.
public record ExpoInfo(Long expoId, String status, LocalDateTime startsAt, LocalDateTime endsAt, Long admissionFee) {

    public boolean isOpen() {
        return "OPEN".equals(status);
    }
}
