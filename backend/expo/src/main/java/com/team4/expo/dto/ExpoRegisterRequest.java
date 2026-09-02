package com.team4.expo.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
public class ExpoRegisterRequest {

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

    @NotEmpty
    @Valid
    private List<BoothRegisterRequest> booths;
}