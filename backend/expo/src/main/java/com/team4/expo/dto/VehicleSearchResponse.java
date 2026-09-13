package com.team4.expo.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;

// 자연어 차량 검색 응답
@Getter
@AllArgsConstructor
public class VehicleSearchResponse {

    private final List<VehicleSearchResultItem> results;
    private final String interpretedSummary; // AI가 질의를 어떻게 이해했는지 한 줄 요약
}
