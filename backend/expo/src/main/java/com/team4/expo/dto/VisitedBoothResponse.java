package com.team4.expo.dto;

import com.team4.expo.domain.Booth;
import java.time.LocalDate;
import lombok.Getter;

// 고객이 QR 스캔으로 방문 기록을 남긴 부스(TASK 7-1) - 후기 작성 대상 선택 화면에 쓰인다.
@Getter
public class VisitedBoothResponse {

    private final Long boothId;
    private final String boothNo;
    private final String companyName;
    // 부스후기를 쓸 수 있는 마지막 날(포함). 지금 작성 가능한 방문 기록이 없으면 null.
    private final LocalDate reviewDeadline;

    private VisitedBoothResponse(Long boothId, String boothNo, String companyName, LocalDate reviewDeadline) {
        this.boothId = boothId;
        this.boothNo = boothNo;
        this.companyName = companyName;
        this.reviewDeadline = reviewDeadline;
    }

    public static VisitedBoothResponse of(Booth booth, String companyName, LocalDate reviewDeadline) {
        return new VisitedBoothResponse(booth.getId(), booth.getBoothNo(), companyName, reviewDeadline);
    }
}
