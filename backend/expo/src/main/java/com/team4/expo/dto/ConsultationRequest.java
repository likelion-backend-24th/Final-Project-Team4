package com.team4.expo.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalTime;
import lombok.Getter;

// 고객의 차량 구매/시승 상담 신청 요청.
// wantsPurchase/wantsTestDrive 둘 다 false인 경우는 서비스 레이어에서 400으로 막는다(최소 1개 토글 필수).
@Getter
public class ConsultationRequest {

    @NotNull
    private Long boothId;

    @NotNull
    private Long vehicleId;

    private boolean wantsPurchase;
    private boolean wantsTestDrive;

    @NotNull
    private LocalDate preferredDate;

    @NotNull
    private LocalTime preferredTime;

    private String message;
}
