package com.team4.reservation.repository;

// 시간대별 건수 집계 결과
public interface HourlyCount {
    Integer getHour();
    Long getCnt();
    Long getFree(); // 무료 입장권 체크인 수
    Long getPaid(); // 유료 입장권 체크인 수
}
