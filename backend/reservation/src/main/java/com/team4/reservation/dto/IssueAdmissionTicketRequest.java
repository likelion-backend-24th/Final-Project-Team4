package com.team4.reservation.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import lombok.Getter;

// 내부 API(Payment -> Reservation) 요청. 결제 완료 직후 당일 입장권 발급을 요청할 때 씀.
@Getter
public class IssueAdmissionTicketRequest {

    @NotNull
    private LocalDate visitDate;
}
