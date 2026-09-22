package com.team4.reservation.dto;

import com.team4.reservation.domain.TicketType;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class CheckInLogResponse {
    private final LocalDateTime checkedInAt; // 체크인 시각
    private final String customerName; // 고객 이름
    private final TicketType ticketType; // FREE | PAID
}
