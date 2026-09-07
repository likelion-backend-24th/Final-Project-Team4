package com.team4.expo.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

// 부스 콘텐츠(게시글) 등록/수정 요청
@Getter
public class BoothContentRequest {

    @NotBlank
    private String title;

    @NotBlank
    private String content;
}
