package com.team4.expo.vehicle.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import lombok.Getter;

@Getter
public class VehicleRequest {

    @NotBlank
    private String name;

    private List<String> tags;

    @NotNull
    private Long startPrice;

    @NotBlank
    private String summary;

    @NotBlank
    private String description;

    private String features;
    private String colors;

    private String range;
    private String battery;
    private String power;

    // 상세 스펙 - AI 자동 분석 결과 또는 직접 입력. 전부 선택 입력.
    private String brand;
    private String category;
    private String drivetrain;
    private String chargingType;
    private String chargingTime;
    private String dimensions;
    private String weight;
    private Integer seatingCapacity;
}