package com.team4.expo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import lombok.Getter;

@Getter
public class BoothApplicationRequest {

    @NotNull
    private Long expoId;

    @NotEmpty
    private List<Long> boothIds;

    @NotBlank
    private String exhibitionItem;

    @NotBlank
    private String conceptDescription;

    private boolean powerRequested;
    private boolean waterSupplyRequested;
    private boolean internetRequested;

    private String additionalRequest;

    // DRAFT: 임시저장(검증 생략), SUBMIT: 최종 제출(신청기간/부스가용/중복 검증 수행)
    @NotNull
    private SaveMode saveMode;

    public enum SaveMode {
        DRAFT, SUBMIT
    }
}
