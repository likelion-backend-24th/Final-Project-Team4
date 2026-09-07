package com.team4.expo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import lombok.Getter;

// 내부 API(Payment -> Expo), 결제 완료 후 그룹 확정 요청
@Getter
public class BoothApplicationGroupConfirmRequest {

    @NotBlank
    private String paymentId;

    @NotNull
    private LocalDateTime paidAt;
}
