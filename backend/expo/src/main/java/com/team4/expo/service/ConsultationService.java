package com.team4.expo.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.expo.client.ReservationClient;
import com.team4.expo.domain.Booth;
import com.team4.expo.domain.BoothStatus;
import com.team4.expo.domain.Consultation;
import com.team4.expo.domain.ConsultationStatus;
import com.team4.expo.dto.ConsultationRequest;
import com.team4.expo.dto.ConsultationResponse;
import com.team4.expo.repository.BoothRepository;
import com.team4.expo.repository.ConsultationRepository;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 고객의 참가업체 상담 신청 제출·조회 (TASK 6-3). 참가업체를 여러 곳 선택해 한 번에 신청하면 업체별로 1건씩 생성된다.
@Service
@Transactional
public class ConsultationService {

    private final BoothRepository boothRepository;
    private final ConsultationRepository consultationRepository;
    private final ReservationClient reservationClient;

    public ConsultationService(BoothRepository boothRepository,
                                ConsultationRepository consultationRepository, ReservationClient reservationClient) {
        this.boothRepository = boothRepository;
        this.consultationRepository = consultationRepository;
        this.reservationClient = reservationClient;
    }

    public List<ConsultationResponse> applyConsultation(Long customerId, ConsultationRequest request) {
        if (!request.isWantsPurchase() && !request.isWantsTestDrive()) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "구매 상담, 시승 상담 중 최소 하나는 선택해야 합니다.");
        }

        List<Long> boothIds = List.copyOf(new LinkedHashSet<>(request.getBoothIds()));
        List<Booth> booths = boothIds.stream().map(this::findAssignedBooth).toList();

        Long expoId = booths.get(0).getExpo().getId();
        boolean sameExpo = booths.stream().allMatch(b -> b.getExpo().getId().equals(expoId));
        if (!sameExpo) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "같은 박람회의 참가업체끼리만 함께 신청할 수 있습니다.");
        }

        boolean hasTicket = reservationClient.hasTicket(customerId, expoId, request.getPreferredDate());
        if (!hasTicket) {
            throw new CustomException(ErrorCode.INVALID_STATE, "신청 날짜의 박람회 입장권을 보유하고 있어야 합니다.");
        }

        for (Booth booth : booths) {
            boolean alreadyApplied = consultationRepository.existsByCustomerIdAndBooth_IdAndPreferredDateAndStatusIn(
                    customerId, booth.getId(), request.getPreferredDate(),
                    List.of(ConsultationStatus.REQUESTED, ConsultationStatus.APPROVED));
            if (alreadyApplied) {
                throw new CustomException(ErrorCode.DUPLICATE, "같은 날짜에 이미 상담을 신청한 참가업체입니다: " + booth.getBoothNo());
            }
        }

        List<Consultation> consultations = booths.stream()
                .map(booth -> new Consultation(booth, customerId, request.getCustomerName(), request.getCustomerPhone(),
                        request.getCustomerEmail(), request.isWantsPurchase(), request.isWantsTestDrive(),
                        request.getInterestedVehicle(), request.isHasDriverLicense(),
                        request.getPreferredDate(), request.getPreferredTime(), request.getMessage()))
                .toList();
        consultationRepository.saveAll(consultations);

        return consultations.stream().map(ConsultationResponse::from).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ConsultationResponse> listMyConsultations(Long customerId) {
        return consultationRepository.findByCustomerIdOrderByCreatedAtDesc(customerId).stream()
                .map(ConsultationResponse::from)
                .collect(Collectors.toList());
    }

    private Booth findAssignedBooth(Long boothId) {
        Booth booth = boothRepository.findById(boothId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "부스를 찾을 수 없습니다."));
        if (booth.getStatus() != BoothStatus.ASSIGNED) {
            throw new CustomException(ErrorCode.INVALID_STATE, "참가 확정된 부스에만 상담을 신청할 수 있습니다.");
        }
        return booth;
    }
}
