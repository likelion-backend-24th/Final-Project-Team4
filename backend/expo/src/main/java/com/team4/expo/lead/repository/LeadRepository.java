package com.team4.expo.lead.repository;

import com.team4.expo.lead.domain.Lead;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LeadRepository extends JpaRepository<Lead, Long> {

    // 같은 QR(=같은 customerId+boothId+visitDate) 재스캔 멱등 처리용. visitDate 뺀 채 두면
    // 같은 부스 재방문(다른 날짜 QR)도 예전 리드로 취급돼 옛 상담메모/이메일 초안이 그대로 나온다(2026-09-18 확인된 버그).
    Optional<Lead> findByBooth_IdAndCustomerIdAndVisitDate(Long boothId, Long customerId, LocalDate visitDate);

    // 부스후기 자격 판단용 - 같은 부스를 여러 날짜에 방문했을 수 있어 방문 기록 전체를 본다(TASK 7-2).
    List<Lead> findByBooth_IdAndCustomerId(Long boothId, Long customerId);

    // 참가업체가 본인 부스로 확보한 리드 목록
    List<Lead> findByBooth_IdOrderByCreatedAtDesc(Long boothId);

    // 고객이 후기 작성 시 참가업체가 현장에서 남긴 상담 메모(interestNote)를 보여주기 위한 조회.
    Optional<Lead> findByConsultation_Id(Long consultationId);

    // 고객이 특정 박람회에서 방문 기록(QR 스캔으로 생성된 Lead)을 남긴 부스 목록(TASK 7-1) - 후기 작성 대상 선택용.
    List<Lead> findByCustomerIdAndBooth_Expo_IdOrderByCreatedAtDesc(Long customerId, Long expoId);

    // 부스 통계(방문자 수) - 참가업체 대시보드용.
    long countByBooth_Id(Long boothId);
}
