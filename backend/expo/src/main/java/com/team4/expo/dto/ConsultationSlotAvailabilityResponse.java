package com.team4.expo.dto;

import java.time.LocalTime;
import java.util.List;
import lombok.Getter;

// 고객용 - 한 날짜의 시간대별 정원/신청 건수. slots에는 정원을 따로 지정했거나 이미 신청이 있는 시간대만 담기고,
// 나머지 시간대는 defaultCapacity(신청 0건)로 보면 된다.
@Getter
public class ConsultationSlotAvailabilityResponse {

    private final int defaultCapacity;
    private final List<Slot> slots;

    public ConsultationSlotAvailabilityResponse(int defaultCapacity, List<Slot> slots) {
        this.defaultCapacity = defaultCapacity;
        this.slots = slots;
    }

    public record Slot(LocalTime time, int capacity, long booked) {}
}
