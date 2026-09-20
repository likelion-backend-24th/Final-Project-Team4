package com.team4.expo.dto;

import com.team4.expo.domain.ConsultationSlotCapacity;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import lombok.Getter;

// 참가업체용 - 부스 기본 정원 + 슬롯별로 덮어쓴 정원.
@Getter
public class ConsultationSlotSettingsResponse {

    private final int defaultCapacity;
    private final List<Slot> slots;

    public ConsultationSlotSettingsResponse(int defaultCapacity, List<ConsultationSlotCapacity> overrides) {
        this.defaultCapacity = defaultCapacity;
        this.slots = overrides.stream().map(o -> new Slot(o.getSlotDate(), o.getSlotTime(), o.getCapacity())).toList();
    }

    public record Slot(LocalDate date, LocalTime time, int capacity) {}
}
