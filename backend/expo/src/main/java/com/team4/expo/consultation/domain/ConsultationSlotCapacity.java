package com.team4.expo.consultation.domain;


import com.team4.expo.booth.domain.Booth;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalTime;
import lombok.Getter;
import lombok.NoArgsConstructor;

// 특정 부스의 특정 날짜·시간 슬롯만 부스 기본 정원(Booth.consultationCapacity) 대신 쓰는 상담 접수 건수. 0이면 마감.
@Entity
@Table(name = "consultation_slot_capacities")
@Getter
@NoArgsConstructor
public class ConsultationSlotCapacity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booth_id")
    private Booth booth;

    private LocalDate slotDate;
    private LocalTime slotTime;
    private int capacity;

    public ConsultationSlotCapacity(Booth booth, LocalDate slotDate, LocalTime slotTime, int capacity) {
        this.booth = booth;
        this.slotDate = slotDate;
        this.slotTime = slotTime;
        this.capacity = capacity;
    }
}
