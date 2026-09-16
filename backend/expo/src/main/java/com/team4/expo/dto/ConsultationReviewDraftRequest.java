package com.team4.expo.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class ConsultationReviewDraftRequest {

    // "CONSULT" | "BOOTH" - review 서비스의 ReviewType 문자열을 그대로 받는다(여기선 프롬프트 분기용일 뿐 검증하지 않음).
    @NotBlank
    private String reviewType;

    private String vehicleName;
}
