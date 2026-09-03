package com.team4.expo.dto;

import lombok.Getter;

// reason 미지정 시 서비스 레이어 기본 사유("결제 기한 초과") 사용.
@Getter
public class BoothApplicationGroupReleaseRequest {
    private String reason;
}
