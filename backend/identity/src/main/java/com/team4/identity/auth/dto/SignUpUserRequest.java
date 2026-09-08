package com.team4.identity.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class SignUpUserRequest {

    @NotBlank
    @Email(message = "이메일 형식이 올바르지 않습니다.")
    private final String email;

    @NotBlank
    @Size(min = 8, max = 64, message = "비밀번호는 8자 이상이어야 합니다.")
    private final String password;

    @NotBlank
    private final String name; // 이름

    @NotBlank
    private final String phone; // 전화번호
}
