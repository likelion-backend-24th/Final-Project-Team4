package com.team4.expo.expo.dto;

import lombok.Getter;

@Getter
public class ExpoDescriptionDraftResponse {
    private final String draft;

    public ExpoDescriptionDraftResponse(String draft){
        this.draft = draft;
    }
}
