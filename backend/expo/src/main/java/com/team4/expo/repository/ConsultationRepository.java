package com.team4.expo.repository;

import com.team4.expo.domain.Consultation;
import com.team4.expo.domain.ConsultationStatus;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConsultationRepository extends JpaRepository<Consultation, Long> {

    // 고객의 마이페이지 - 내 상담 신청 내역
    List<Consultation> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    // 참가업체가 담당하는(참가 확정된) 부스들로 들어온 상담 신청 목록
    List<Consultation> findByBooth_IdInOrderByCreatedAtDesc(List<Long> boothIds);

    // 같은 고객이 같은 차량에 같은 날짜로 이미 처리 중(REQUESTED/APPROVED)인 신청이 있는지 - 중복 신청 방지.
    // REJECTED는 제외해서 반려 후 재신청은 허용한다.
    boolean existsByCustomerIdAndVehicle_IdAndPreferredDateAndStatusIn(
            Long customerId, Long vehicleId, LocalDate preferredDate, List<ConsultationStatus> statuses);
}
