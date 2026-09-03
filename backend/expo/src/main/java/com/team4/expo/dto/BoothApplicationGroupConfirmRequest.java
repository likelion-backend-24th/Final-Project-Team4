package com.team4.expo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import lombok.Getter;

@Getter
public class BoothApplicationGroupConfirmRequest {

    @NotBlank
    private String paymentId;

    @NotNull
    private LocalDateTime paidAt;
}
