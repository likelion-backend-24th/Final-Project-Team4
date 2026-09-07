package com.team4.expo.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

// 박람회 등록 요청(부스 목록 포함)
@Getter
public class ExpoRegisterRequest {

    @NotBlank
    private String title;

    @NotBlank
    private String venue;

    @NotNull
    private LocalDateTime startsAt;

    @NotNull
    private LocalDateTime endsAt;

    @NotNull
    private LocalDateTime applyStartsAt;

    @NotNull
    private LocalDateTime applyEndsAt;

    @NotEmpty
    @Valid
    private List<BoothRegisterRequest> booths;

    // 박람회 시작 이후(사전 예약 마감 후) 방문객이 내야 하는 당일 입장료. Reservation이 이 값을 내부 API로 조회해
    // Payment의 당일 유료 입장권 결제 금액으로 씀(US17/US18). 0이면 당일에도 무료.
    @NotNull
    @PositiveOrZero
    private Long admissionFee;
}