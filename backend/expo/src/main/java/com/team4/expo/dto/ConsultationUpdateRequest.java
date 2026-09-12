package com.team4.expo.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalTime;
import lombok.Getter;

// 고객이 본인의 대기 중(REQUESTED) 상담 신청 내용을 수정할 때 쓰는 요청.
// wantsPurchase/wantsTestDrive 둘 다 false인 경우는 서비스 레이어에서 400으로 막는다(최소 1개 토글 필수).
@Getter
public class ConsultationUpdateRequest {

    private boolean wantsPurchase;
    private boolean wantsTestDrive;

    private String interestedVehicle;
    private boolean hasDriverLicense;

    @NotNull
    private LocalDate preferredDate;

    @NotNull
    private LocalTime preferredTime;

    private String message;
}
