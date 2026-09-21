package com.team4.reservation.repository;

// 시간대별 건수 집계 결과
public interface HourlyCount {
    Integer getHour();
    Long getCnt();
}
