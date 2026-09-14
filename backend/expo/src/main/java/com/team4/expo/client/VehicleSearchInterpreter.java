package com.team4.expo.client;

import com.team4.expo.dto.VehicleSearchCandidate;
import java.util.List;
import java.util.Optional;

// 자연어 질의 + 후보 차량 목록을 AI에 넘겨, 조건에 맞는 차량만 골라받음
public interface VehicleSearchInterpreter {
    Optional<VehicleSearchInterpretation> search(String query, List<VehicleSearchCandidate> candidates);
}
