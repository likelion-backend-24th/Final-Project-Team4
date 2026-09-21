package com.team4.reservation.repository;

import java.time.LocalDate;

// 일별 건수 집계 결과
public interface DailyCount {
    LocalDate getDay();
    Long getCnt();
}
