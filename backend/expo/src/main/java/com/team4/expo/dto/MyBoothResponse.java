package com.team4.expo.dto;

import com.team4.expo.domain.Booth;

// 참가업체가 QR 리드 화면에서 본인 부스를 고를 때 쓰는 최소 정보(TASK 11-2 후속 - 부스 선택 UI)
public record MyBoothResponse(Long boothId, String boothNo, Long expoId, String expoTitle) {
    public static MyBoothResponse from(Booth booth) {
        return new MyBoothResponse(booth.getId(), booth.getBoothNo(), booth.getExpo().getId(), booth.getExpo().getTitle());
    }
}
