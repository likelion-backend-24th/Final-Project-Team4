package com.team4.expo.dto;

import lombok.Getter;

@Getter
public class ConsultationReviewDraftResponse {

    // Gemini 미설정/호출 실패 시 null(부가 기능, fail-open) - 프론트가 null이면 "생성 실패" 안내만 하고 수동 작성 유지.
    private final String draft;

    public ConsultationReviewDraftResponse(String draft) {
        this.draft = draft;
    }
}
