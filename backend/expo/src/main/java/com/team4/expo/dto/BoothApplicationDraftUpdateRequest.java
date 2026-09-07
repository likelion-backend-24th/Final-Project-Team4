package com.team4.expo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import lombok.Getter;

// 임시저장(DRAFT) 부스 신청 그룹 수정 요청
@Getter
public class BoothApplicationDraftUpdateRequest {

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
}
