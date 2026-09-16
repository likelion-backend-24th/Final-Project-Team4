package com.team4.expo.repository;

import com.team4.expo.domain.Consultation;
import com.team4.expo.domain.ConsultationStatus;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ConsultationRepository extends JpaRepository<Consultation, Long> {

    // 고객의 마이페이지 - 내 상담 신청 내역. ConsultationResponse.from이 booth.boothNo/booth.expo.title까지
    // 읽어서(id만 쓰는 게 아님) JOIN FETCH로 한 번에 가져옴 - 안 그러면 상담 건수만큼 booth/expo 쿼리가 추가로 나간다(N+1).
    @Query("SELECT c FROM Consultation c JOIN FETCH c.booth b JOIN FETCH b.expo "
            + "WHERE c.customerId = :customerId ORDER BY c.createdAt DESC")
    List<Consultation> findByCustomerIdOrderByCreatedAtDesc(@Param("customerId") Long customerId);

    // 참가업체가 담당하는(참가 확정된) 부스들로 들어온 상담 신청 목록. 위와 같은 이유로 JOIN FETCH.
    @Query("SELECT c FROM Consultation c JOIN FETCH c.booth b JOIN FETCH b.expo "
            + "WHERE c.booth.id IN :boothIds ORDER BY c.createdAt DESC")
    List<Consultation> findByBooth_IdInOrderByCreatedAtDesc(@Param("boothIds") List<Long> boothIds);

    // 같은 고객이 같은 참가업체(부스)에 같은 날짜로 이미 처리 중(REQUESTED/APPROVED)인 신청이 있는지 - 중복 신청 방지.
    // REJECTED는 제외해서 반려 후 재신청은 허용한다.
    boolean existsByCustomerIdAndBooth_IdAndPreferredDateAndStatusIn(
            Long customerId, Long boothId, LocalDate preferredDate, List<ConsultationStatus> statuses);

    // QR 스캔 리드 생성 시 - 같은 고객+부스+방문일(visitDate=preferredDate)의 승인된 신청을 찾아 리드에 연결(TASK 11-2)
    Optional<Consultation> findByCustomerIdAndBooth_IdAndPreferredDateAndStatus(
            Long customerId, Long boothId, LocalDate preferredDate, ConsultationStatus status);

    // 후기 작성 자격 검증 - 이 부스에서 상담을 완료(COMPLETED)한 적이 있어야 후기를 남길 수 있다.
    boolean existsByCustomerIdAndBooth_IdAndStatus(Long customerId, Long boothId, ConsultationStatus status);
}
