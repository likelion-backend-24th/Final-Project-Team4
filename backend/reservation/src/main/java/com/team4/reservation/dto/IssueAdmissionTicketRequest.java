package com.team4.reservation.dto;

import jakarta.validation.constraints.NotEmpty;
import java.time.LocalDate;
import java.util.List;
import lombok.Getter;

// 내부 API(Payment -> Reservation) 요청. 결제 완료 직후 유료 입장권 발급을 요청할 때 씀.
// 날짜를 여러 개 고르면(무료 방문예약과 동일한 방식) 그만큼 티켓이 한 번에 발급됨.
@Getter
public class IssueAdmissionTicketRequest {

    @NotEmpty
    private List<LocalDate> visitDates;
}
