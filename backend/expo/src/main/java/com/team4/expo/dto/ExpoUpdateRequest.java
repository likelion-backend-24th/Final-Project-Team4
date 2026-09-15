package com.team4.expo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;

import java.time.LocalDateTime;

// 박람회 정보 수정 요청
@Getter
public class ExpoUpdateRequest {

    @NotBlank
    private String title;

    @NotBlank
    private String venue;

    @NotNull
    private LocalDateTime startsAt;

    @NotNull
    private LocalDateTime endsAt;

    @NotNull
    private LocalDateTime applyStartsAt;

    @NotNull
    private LocalDateTime applyEndsAt;

    @NotNull
    @PositiveOrZero // 입장료 음수 불가
    private Long admissionFee;
}
