package com.team4.reservation.dto;

import java.time.LocalDateTime;
import lombok.Getter;

// 체크인 처리 결과
@Getter
public class CheckInResponse {

    private final Long ticketId;
    private final Long customerId;
    private final Long expoId;
    private final LocalDateTime checkedInAt;

    public CheckInResponse(Long ticketId, Long customerId, Long expoId, LocalDateTime checkedInAt) {
        this.ticketId = ticketId;
        this.customerId = customerId;
        this.expoId = expoId;
        this.checkedInAt = checkedInAt;
    }
}
