package com.team4.expo.dto;

import com.team4.expo.domain.Booth;
import lombok.Getter;

// 고객이 QR 스캔으로 방문 기록을 남긴 부스(TASK 7-1) - 후기 작성 대상 선택 화면에 쓰인다.
@Getter
public class VisitedBoothResponse {

    private final Long boothId;
    private final String boothNo;
    private final String companyName;

    private VisitedBoothResponse(Long boothId, String boothNo, String companyName) {
        this.boothId = boothId;
        this.boothNo = boothNo;
        this.companyName = companyName;
    }

    public static VisitedBoothResponse of(Booth booth, String companyName) {
        return new VisitedBoothResponse(booth.getId(), booth.getBoothNo(), companyName);
    }
}
