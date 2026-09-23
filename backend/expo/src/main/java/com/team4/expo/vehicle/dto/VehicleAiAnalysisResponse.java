package com.team4.expo.vehicle.dto;

import java.util.List;

// 차량 사진 1장을 AI(Gemini Vision)로 분석한 결과.
public record VehicleAiAnalysisResponse(
        boolean analyzed,
        String name,
        String brand,
        String category,
        List<String> tags,
        String summary,
        String description,
        String features,
        String colors,
        String range,
        String battery,
        String power,
        String drivetrain,
        String chargingType,
        String chargingTime,
        String dimensions,
        String weight,
        Integer seatingCapacity
) {
    public static VehicleAiAnalysisResponse notAnalyzed() {
        return new VehicleAiAnalysisResponse(
                false, null, null, null, List.of(), null, null, null, null,
                null, null, null, null, null, null, null, null, null);
    }
}