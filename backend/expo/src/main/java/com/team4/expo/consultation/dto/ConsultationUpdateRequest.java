package com.team4.expo.consultation.dto;

import jakarta.validation.constraints.AssertTrue;
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

    // 신청 시 필수 동의였던 항목 - 수정 중에 철회할 수 없게 같은 제약을 건다(2026-09-15).
    @AssertTrue(message = "리드 확보(연락처 제공) 동의가 필요합니다.")
    private boolean leadConsent;
}
