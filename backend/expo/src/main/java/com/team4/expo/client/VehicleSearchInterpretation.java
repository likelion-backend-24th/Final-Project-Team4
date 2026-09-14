package com.team4.expo.client;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;

// VehicleSearchInterpreter 호출 결과 - 조건에 맞는 후보 id 목록 + 한 줄 이해 요약
@Getter
@AllArgsConstructor
public class VehicleSearchInterpretation {
    private final List<Long> matchedVehicleIds;
    private final String summary;
}
