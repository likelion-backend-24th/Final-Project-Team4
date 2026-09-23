package com.team4.expo.consultation.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.expo.booth.domain.ApplicationStatus;
import com.team4.expo.booth.domain.Booth;
import com.team4.expo.consultation.domain.ConsultationSlotCapacity;
import com.team4.expo.consultation.domain.ConsultationStatus;
import com.team4.expo.consultation.dto.ConsultationSlotAvailabilityResponse;
import com.team4.expo.consultation.dto.ConsultationSlotSettingsRequest;
import com.team4.expo.consultation.dto.ConsultationSlotSettingsResponse;
import com.team4.expo.booth.repository.BoothApplicationRepository;
import com.team4.expo.booth.repository.BoothRepository;
import com.team4.expo.consultation.repository.ConsultationRepository;
import com.team4.expo.consultation.repository.ConsultationSlotCapacityRepository;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 참가업체가 날짜·시간 슬롯마다 받을 상담 건수(정원)를 지정하고, 고객 신청 시 그 정원을 넘지 않게 막는다.
// 슬롯별 지정이 없으면 부스 기본 정원(Booth.consultationCapacity, 기본 1건)을 쓴다.
@Service
@Transactional
public class ConsultationSlotService {

    private static final List<ApplicationStatus> CONFIRMED_ONLY = List.of(ApplicationStatus.CONFIRMED);

    // 정원을 차지하는 상태 - 대기/승인만(반려·취소는 자리를 반환, 2026-09-20 확정).
    private static final List<ConsultationStatus> SLOT_OCCUPYING_STATUSES =
            List.of(ConsultationStatus.REQUESTED, ConsultationStatus.APPROVED);

    private final BoothRepository boothRepository;
    private final BoothApplicationRepository boothApplicationRepository;
    private final ConsultationRepository consultationRepository;
    private final ConsultationSlotCapacityRepository slotCapacityRepository;

    public ConsultationSlotService(BoothRepository boothRepository, BoothApplicationRepository boothApplicationRepository,
                                   ConsultationRepository consultationRepository,
                                   ConsultationSlotCapacityRepository slotCapacityRepository) {
        this.boothRepository = boothRepository;
        this.boothApplicationRepository = boothApplicationRepository;
        this.consultationRepository = consultationRepository;
        this.slotCapacityRepository = slotCapacityRepository;
    }

    @Transactional(readOnly = true)
    public ConsultationSlotSettingsResponse getSettings(Long exhibitorId, Long boothId) {
        Booth booth = findOwnedBooth(exhibitorId, boothId);
        return new ConsultationSlotSettingsResponse(booth.getConsultationCapacity(),
                slotCapacityRepository.findByBooth_IdOrderBySlotDateAscSlotTimeAsc(boothId));
    }

    // 기본 정원과 슬롯별 정원을 요청 내용으로 통째로 교체한다. 이미 접수된 상담은 건드리지 않는다(정원을 줄여도 기존 신청은 유지).
    public ConsultationSlotSettingsResponse saveSettings(Long exhibitorId, Long boothId, ConsultationSlotSettingsRequest request) {
        Booth booth = findOwnedBooth(exhibitorId, boothId);
        booth.changeConsultationCapacity(request.getDefaultCapacity());

        // 같은 날짜·시간이 중복으로 오면 마지막 값만 남긴다(유니크 키 충돌 방지).
        Map<String, ConsultationSlotCapacity> unique = new HashMap<>();
        request.getSlots().forEach(s ->
                unique.put(s.getDate() + " " + s.getTime(), new ConsultationSlotCapacity(booth, s.getDate(), s.getTime(), s.getCapacity())));

        slotCapacityRepository.deleteAllByBoothId(boothId);
        slotCapacityRepository.saveAll(unique.values());

        return new ConsultationSlotSettingsResponse(booth.getConsultationCapacity(),
                slotCapacityRepository.findByBooth_IdOrderBySlotDateAscSlotTimeAsc(boothId));
    }

    // 고객이 신청 화면에서 시간대별 잔여를 계산할 수 있게 한 날짜의 정원/신청 건수를 내려준다.
    @Transactional(readOnly = true)
    public ConsultationSlotAvailabilityResponse getAvailability(Long boothId, LocalDate date) {
        Booth booth = boothRepository.findById(boothId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "부스를 찾을 수 없습니다."));

        Map<LocalTime, Integer> capacityByTime = new HashMap<>();
        slotCapacityRepository.findByBooth_IdAndSlotDate(boothId, date)
                .forEach(o -> capacityByTime.put(o.getSlotTime(), o.getCapacity()));

        Map<LocalTime, Long> bookedByTime = new HashMap<>();
        consultationRepository.countByTimeForDate(boothId, date, SLOT_OCCUPYING_STATUSES)
                .forEach(row -> bookedByTime.put((LocalTime) row[0], (Long) row[1]));

        TreeSet<LocalTime> times = new TreeSet<>(capacityByTime.keySet());
        times.addAll(bookedByTime.keySet());

        List<ConsultationSlotAvailabilityResponse.Slot> slots = times.stream()
                .map(t -> new ConsultationSlotAvailabilityResponse.Slot(
                        t, capacityByTime.getOrDefault(t, booth.getConsultationCapacity()), bookedByTime.getOrDefault(t, 0L)))
                .toList();

        return new ConsultationSlotAvailabilityResponse(booth.getConsultationCapacity(), slots);
    }

    // 상담 신청/일정 변경 시 호출 - 그 슬롯이 정원에 도달했으면 409. 부스 행을 잠가 같은 슬롯 동시 신청이 정원을 넘기지 못하게 한다.
    // 여러 부스를 함께 신청하는 경우 호출부가 부스 id 오름차순으로 호출해야 데드락이 나지 않는다.
    public void ensureSlotAvailable(Long boothId, LocalDate date, LocalTime time) {
        Booth booth = boothRepository.findByIdForUpdate(boothId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "부스를 찾을 수 없습니다."));

        int capacity = slotCapacityRepository.findByBooth_IdAndSlotDateAndSlotTime(boothId, date, time)
                .map(ConsultationSlotCapacity::getCapacity)
                .orElse(booth.getConsultationCapacity());
        long booked = consultationRepository.countByBooth_IdAndPreferredDateAndPreferredTimeAndStatusIn(
                boothId, date, time, SLOT_OCCUPYING_STATUSES);

        if (booked >= capacity) {
            throw new CustomException(ErrorCode.INVALID_STATE,
                    "선택한 시간대는 접수가 마감되었습니다: " + booth.getBoothNo() + " " + date + " " + time);
        }
    }

    private Booth findOwnedBooth(Long exhibitorId, Long boothId) {
        Booth booth = boothRepository.findById(boothId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "부스를 찾을 수 없습니다."));
        if (!boothApplicationRepository.existsByBooth_IdAndExhibitorIdAndStatusIn(boothId, exhibitorId, CONFIRMED_ONLY)) {
            throw new CustomException(ErrorCode.FORBIDDEN, "참가 확정된 담당 부스만 관리할 수 있습니다.");
        }
        return booth;
    }
}
