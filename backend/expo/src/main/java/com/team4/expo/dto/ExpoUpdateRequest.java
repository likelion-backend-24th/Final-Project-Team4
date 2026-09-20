package com.team4.expo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Getter;

import java.time.LocalDateTime;

// 박람회 정보 수정 요청
@Getter
public class ExpoUpdateRequest {

    @NotBlank
    private String title;

    @NotBlank
    private String venue;

    @Size(max = 1000)
    private String description;

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
