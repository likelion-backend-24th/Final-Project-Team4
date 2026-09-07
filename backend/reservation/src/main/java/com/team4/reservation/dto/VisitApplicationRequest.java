package com.team4.reservation.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;
import lombok.Getter;

// 박람회 방문 예약 신청. 날짜를 여러 개 고르면 그만큼 티켓(QR)이 각각 발급됨
@Getter
public class VisitApplicationRequest {

    @NotNull
    private Long expoId;

    @NotEmpty
    private List<LocalDate> visitDates;
}
