package com.team4.expo.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import lombok.Getter;

// 참가업체가 상담 접수 정원을 저장하는 요청. 기존 슬롯별 설정은 전부 이 내용으로 교체된다.
@Getter
public class ConsultationSlotSettingsRequest {

    @Min(0)
    @Max(999)
    private int defaultCapacity;

    @Valid
    private List<Slot> slots = List.of();

    @Getter
    public static class Slot {
        @NotNull
        private LocalDate date;

        @NotNull
        private LocalTime time;

        @Min(0)
        @Max(999)
        private int capacity;
    }
}
