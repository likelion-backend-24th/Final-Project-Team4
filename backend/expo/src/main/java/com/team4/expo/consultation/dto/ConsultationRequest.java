package com.team4.expo.consultation.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import lombok.Getter;

// 고객의 참가업체 상담 신청 요청 — 참가업체 여러 곳을 한 번에 선택해 같은 정보로 신청한다(업체별로 1건씩 생성됨).
// wantsPurchase/wantsTestDrive 둘 다 false인 경우는 서비스 레이어에서 400으로 막는다(최소 1개 토글 필수).
@Getter
public class ConsultationRequest {

    @NotEmpty
    private List<Long> boothIds;

    @NotBlank
    private String customerName;

    @NotBlank
    private String customerPhone;

    @NotBlank
    private String customerEmail;

    private boolean wantsPurchase;
    private boolean wantsTestDrive;

    private String interestedVehicle;
    private boolean hasDriverLicense;

    @NotNull
    private LocalDate preferredDate;

    @NotNull
    private LocalTime preferredTime;

    private String message;

    // 참가업체가 현장에서 QR 스캔으로 연락처를 확보하는 데 동의하는지(STORY 11).
    // 2026-09-15 확정: 필수 동의로 전환 - 동의하지 않으면 상담 신청 자체를 받지 않는다.
    @AssertTrue(message = "리드 확보(연락처 제공) 동의가 필요합니다.")
    private boolean leadConsent;
}
