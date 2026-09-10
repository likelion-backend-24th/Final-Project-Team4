package com.team4.expo.repository;

import com.team4.expo.domain.Consultation;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConsultationRepository extends JpaRepository<Consultation, Long> {

    // 고객의 마이페이지 - 내 상담 신청 내역
    List<Consultation> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    // 참가업체가 담당하는(참가 확정된) 부스들로 들어온 상담 신청 목록
    List<Consultation> findByBooth_IdInOrderByCreatedAtDesc(List<Long> boothIds);
}
