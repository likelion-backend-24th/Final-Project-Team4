package com.team4.expo.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor
public class ExpoBoothsResponse {

    private final Long expoId;
    private final String title;
    private final int totalCount;      // 박람회 전체 부스 수
    private final int availableCount;  // 신청 가능 수
    private final List<BoothDetail> booths; // 부스 목록
}
