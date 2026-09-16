package com.team4.expo.repository;

import com.team4.expo.domain.Lead;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LeadRepository extends JpaRepository<Lead, Long> {

    // 같은 QR(=같은 customerId+boothId) 재스캔 멱등 처리용
    Optional<Lead> findByBooth_IdAndCustomerId(Long boothId, Long customerId);

    // 참가업체가 본인 부스로 확보한 리드 목록
    List<Lead> findByBooth_IdOrderByCreatedAtDesc(Long boothId);

    // 고객이 후기 작성 시 참가업체가 현장에서 남긴 상담 메모(interestNote)를 보여주기 위한 조회.
    Optional<Lead> findByConsultation_Id(Long consultationId);

    // 고객이 특정 박람회에서 방문 기록(QR 스캔으로 생성된 Lead)을 남긴 부스 목록(TASK 7-1) - 후기 작성 대상 선택용.
    List<Lead> findByCustomerIdAndBooth_Expo_IdOrderByCreatedAtDesc(Long customerId, Long expoId);
}
