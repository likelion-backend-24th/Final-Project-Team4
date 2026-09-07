package com.team4.reservation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

// 현장 QR 스캔 체크인 요청
@Getter
public class CheckInRequest {

    @NotBlank
    private String qrToken; // 스캐너/입력폼에서 받은 QR 원문 문자열 그대로 (이미지가 아니라 텍스트값)

    @NotNull
    private Long expoId; // 지금 찍는 박람회. 티켓이 발급된 expoId와 다르면 CheckInService가 409로 막음.
}
