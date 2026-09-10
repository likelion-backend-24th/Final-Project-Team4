package com.team4.identity.auth.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

// Jackson이 단일 필드 dto 역직렬화 시 delegating creator로 오인. -> JsonCreator 사용
@Getter
public class PasswordResetRequest {

    @NotBlank
    @Email(message = "이메일 형식이 올바르지 않습니다.")
    private String email;

    @JsonCreator(mode = JsonCreator.Mode.PROPERTIES)
    public PasswordResetRequest(@JsonProperty("email") String email) {
        this.email = email;
    }
}
