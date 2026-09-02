package com.team4.identity.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class SignUpExhibitorRequest {

    @NotBlank
    @Pattern(regexp = "^\\d{3}-?\\d{2}-?\\d{5}$", message = "사업자등록번호 형식이 올바르지 않습니다.")
    private final String businessNo;

    @NotBlank
    @Size(min = 8, max = 64, message = "비밀번호는 8자 이상이어야 합니다.")
    private final String password;

    @NotBlank
    @Email(message = "담당자 이메일 형식이 올바르지 않습니다.")
    private final String email;

    @NotBlank
    private final String companyName;   // 상호명

    @NotBlank
    private final String managerName;   // 담당자 이름

    @NotBlank
    private final String contact;       // 담당자 연락처(전화)
}
