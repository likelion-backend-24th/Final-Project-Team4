package com.team4.review.dto;

import com.team4.review.domain.ReviewType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

@Getter
public class ReviewRequest {

    @NotNull
    private ReviewType reviewType;

    // CONSULT(상담후기)일 때만 필수 - 어떤 차량에 대한 후기인지
    private String vehicleName;

    // CONSULT(상담후기)일 때 필수 - 어느 상담에 대한 후기인지(상담 1건당 후기 1개)
    private Long consultationId;

    @NotBlank
    private String content;
}
