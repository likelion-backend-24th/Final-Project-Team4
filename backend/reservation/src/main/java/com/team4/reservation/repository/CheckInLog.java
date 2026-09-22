package com.team4.reservation.repository;

import com.team4.reservation.domain.TicketType;
import java.time.LocalDateTime;

// 입장 현황 목록 한 줄(체크인 + 그 티켓 정보) 조회 결과. 고객 이름은 Identity에서 따로 붙임
public interface CheckInLog {
    LocalDateTime getCheckedInAt();
    Long getCustomerId();
    TicketType getTicketType();
}
