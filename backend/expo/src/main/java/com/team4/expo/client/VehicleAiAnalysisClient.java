package com.team4.expo.client;

import com.team4.expo.vehicle.dto.VehicleAiAnalysisResponse;

import java.util.List;
import java.util.Optional;

// 차량 사진(정면/측면/후면 등 1~여러 장)을 AI로 분석해 이름/브랜드/배터리/주행거리 등 스펙 초안을 추출.
// 부스 관리자가 사진만 올리면 폼을 자동으로 채워주는 보조 기능이라, 실패해도 차량 등록 자체는 막지 않는다
// (구현체는 예외를 삼키고 Optional.empty()를 반환 - fail-open).
public interface VehicleAiAnalysisClient {
    Optional<VehicleAiAnalysisResponse> analyzeVehicleImages(List<VehicleImageInput> images);
}