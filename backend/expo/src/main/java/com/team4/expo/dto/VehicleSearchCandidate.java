package com.team4.expo.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

// 자연어 차량 검색 - AI에게 후보로 넘길 압축된 차량 정보
@Getter
@AllArgsConstructor
public class VehicleSearchCandidate {

    private final Long vehicleId;
    private final String name;
    private final String tags;
    private final Long startPrice;
    private final String summary;
    private final String description;
    private final String features;
    private final String colors;
    private final String range;
    private final String battery;
    private final String power;
    private final String brand;
    private final String category;
    private final String drivetrain;
    private final Integer seatingCapacity;
}
