package com.team4.expo.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.expo.client.ReservationClient;
import com.team4.expo.domain.Booth;
import com.team4.expo.domain.BoothStatus;
import com.team4.expo.domain.Consultation;
import com.team4.expo.domain.Vehicle;
import com.team4.expo.dto.ConsultationRequest;
import com.team4.expo.dto.ConsultationResponse;
import com.team4.expo.repository.BoothRepository;
import com.team4.expo.repository.ConsultationRepository;
import com.team4.expo.repository.VehicleRepository;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 고객의 차량 구매/시승 상담 신청 제출·조회 (TASK 6-3).
@Service
@Transactional
public class ConsultationService {

    private final BoothRepository boothRepository;
    private final VehicleRepository vehicleRepository;
    private final ConsultationRepository consultationRepository;
    private final ReservationClient reservationClient;

    public ConsultationService(BoothRepository boothRepository, VehicleRepository vehicleRepository,
                                ConsultationRepository consultationRepository, ReservationClient reservationClient) {
        this.boothRepository = boothRepository;
        this.vehicleRepository = vehicleRepository;
        this.consultationRepository = consultationRepository;
        this.reservationClient = reservationClient;
    }

    public ConsultationResponse applyConsultation(Long customerId, ConsultationRequest request) {
        if (!request.isWantsPurchase() && !request.isWantsTestDrive()) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "구매 상담, 시승 상담 중 최소 하나는 선택해야 합니다.");
        }

        Booth booth = boothRepository.findById(request.getBoothId())
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "부스를 찾을 수 없습니다."));

        if (booth.getStatus() != BoothStatus.ASSIGNED) {
            throw new CustomException(ErrorCode.INVALID_STATE, "참가 확정된 부스에만 상담을 신청할 수 있습니다.");
        }

        Vehicle vehicle = vehicleRepository.findById(request.getVehicleId())
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "차량을 찾을 수 없습니다."));

        if (!vehicle.getBooth().getId().equals(booth.getId())) {
            throw new CustomException(ErrorCode.NOT_FOUND, "차량이 해당 부스 소속이 아닙니다.");
        }

        boolean hasTicket = reservationClient.hasTicket(customerId, booth.getExpo().getId(), request.getPreferredDate());
        if (!hasTicket) {
            throw new CustomException(ErrorCode.INVALID_STATE, "신청 날짜의 박람회 입장권을 보유하고 있어야 합니다.");
        }

        Consultation consultation = new Consultation(booth, vehicle, customerId,
                request.isWantsPurchase(), request.isWantsTestDrive(),
                request.getPreferredDate(), request.getPreferredTime(), request.getMessage());

        consultationRepository.save(consultation);
        return ConsultationResponse.from(consultation);
    }

    @Transactional(readOnly = true)
    public List<ConsultationResponse> listMyConsultations(Long customerId) {
        return consultationRepository.findByCustomerIdOrderByCreatedAtDesc(customerId).stream()
                .map(ConsultationResponse::from)
                .collect(Collectors.toList());
    }
}
