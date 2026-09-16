package com.team4.expo.dto;

import com.team4.expo.domain.ReviewType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

@Getter
public class ReviewRequest {

    @NotNull
    private ReviewType reviewType;

    // CONSULT(상담후기)일 때만 필수 - 어떤 차량에 대한 후기인지
    private String vehicleName;

    @NotBlank
    private String content;
}
