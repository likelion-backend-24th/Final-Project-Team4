package com.team4.expo.vehicle.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

// 자연어 차량 검색 결과 1건
@Getter
@AllArgsConstructor
public class VehicleSearchResultItem {

    private final Long expoId;
    private final String expoTitle;
    private final Long boothId;
    private final String boothNo;
    private final String companyName;
    private final VehicleResponse vehicle;
}
