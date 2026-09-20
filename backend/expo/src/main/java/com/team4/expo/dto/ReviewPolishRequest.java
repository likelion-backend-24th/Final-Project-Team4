package com.team4.expo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;

// 후기 문장 AI 다듬기 요청. 후기 본문 최대 길이(review 서비스 reviews.content 1000자)와 같은 상한을 둔다.
@Getter
public class ReviewPolishRequest {

    // "CONSULT" | "BOOTH" - 프롬프트 분기용일 뿐 검증하지 않는다(ConsultationReviewDraftRequest와 동일).
    @NotBlank
    private String reviewType;

    private String vehicleName;

    @NotBlank
    @Size(max = 1000)
    private String content;
}
