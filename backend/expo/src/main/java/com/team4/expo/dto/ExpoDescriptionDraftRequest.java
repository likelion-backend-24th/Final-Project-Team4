package com.team4.expo.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class ExpoDescriptionDraftRequest {

    @NotBlank
    private String title;
    private String venue;
}
