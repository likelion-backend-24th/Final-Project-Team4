package com.team4.payment.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;

// 환불 요청 - 사유
@Getter
public class RefundRequest {
    @NotBlank
    private final String reason;

    @JsonCreator(mode = JsonCreator.Mode.PROPERTIES)
    public RefundRequest(@JsonProperty("reason") String reason){
        this.reason = reason;
    }
}
