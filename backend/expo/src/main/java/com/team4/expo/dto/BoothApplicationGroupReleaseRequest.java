package com.team4.expo.dto;

import lombok.Getter;

// 내부 API(Payment -> Expo), 그룹 내 승인 부스 반납(해제) 요청. reason 미지정 시 서비스 레이어 기본 사유("결제 기한 초과") 사용.
@Getter
public class BoothApplicationGroupReleaseRequest {
    private String reason;
}
