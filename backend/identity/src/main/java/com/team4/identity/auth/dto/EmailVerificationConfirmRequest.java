package com.team4.identity.auth.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

// Jackson이 단일 필드 dto 역직렬화 시 delegating creator로 오인. -> JsonCreator 사용
@Getter
public class EmailVerificationConfirmRequest {

    @NotBlank
    private String token; // 인증 링크의 토큰

    @JsonCreator(mode = JsonCreator.Mode.PROPERTIES)
    public EmailVerificationConfirmRequest(@JsonProperty("token") String token) {
        this.token = token;
    }
}
