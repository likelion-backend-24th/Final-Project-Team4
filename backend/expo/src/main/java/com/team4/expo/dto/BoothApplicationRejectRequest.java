package com.team4.expo.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

// 부스 신청 반려 요청(사유 필수)
@Getter
public class BoothApplicationRejectRequest {

    @NotBlank
    private String reason;
}
