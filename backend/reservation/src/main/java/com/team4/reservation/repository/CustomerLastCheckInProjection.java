package com.team4.reservation.repository;

import java.time.LocalDateTime;

public interface CustomerLastCheckInProjection {
    Long getCustomerId();
    LocalDateTime getLastCheckedInAt();
}
