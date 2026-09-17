package com.team4.payment.repository;

import java.time.LocalDate;

// 일별 건수, 금액 집계 결과
public interface DailyAmountCount {
    LocalDate getDay();
    Long getCnt();
    Long getAmt();
}
