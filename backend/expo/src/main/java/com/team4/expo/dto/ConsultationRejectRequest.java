package com.team4.expo.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

// 상담 신청 반려 요청(사유 필수)
@Getter
public class ConsultationRejectRequest {

    @NotBlank
    private String reason;
}
