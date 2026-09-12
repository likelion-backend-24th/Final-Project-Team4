package com.team4.identity.auth.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

// 이메일 받는 요청 - 비밀번호 재설정 요청, 이메일 인증 재발송에서 사용
// Jackson이 단일 필드 dto 역직렬화 시 delegating creator로 오인. -> JsonCreator 사용
@Getter
public class EmailRequest {

    @NotBlank
    @Email(message = "이메일 형식이 올바르지 않습니다.")
    private String email;

    @JsonCreator(mode = JsonCreator.Mode.PROPERTIES)
    public EmailRequest(@JsonProperty("email") String email) {
        this.email = email;
    }
}
