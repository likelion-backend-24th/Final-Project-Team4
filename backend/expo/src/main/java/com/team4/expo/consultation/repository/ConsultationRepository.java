package com.team4.expo.consultation.repository;


import com.team4.expo.consultation.domain.Consultation;
import com.team4.expo.consultation.domain.ConsultationStatus;
import java.time.LocalDate;
import java.time.LocalTime;
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

    // 같은 고객이 같은 참가업체(부스)에 같은 날짜로 이미 신청한 적이 있는지 - 중복 신청 방지.
    // 호출부(ConsultationService.DUPLICATE_BLOCKING_STATUSES)가 CANCELED/REJECTED만 빼고 넘겨서,
    // 취소·반려된 건만 재신청 허용하고 REQUESTED/APPROVED/COMPLETED/NO_SHOW는 전부 막는다(2026-09-16 확정).
    boolean existsByCustomerIdAndBooth_IdAndPreferredDateAndStatusIn(
            Long customerId, Long boothId, LocalDate preferredDate, List<ConsultationStatus> statuses);

    // 상담 정원 계산용 - 그 부스·날짜·시간에서 정원을 차지하는 상태(호출부가 대기/승인만 넘김)의 신청 건수.
    long countByBooth_IdAndPreferredDateAndPreferredTimeAndStatusIn(
            Long boothId, LocalDate preferredDate, LocalTime preferredTime, List<ConsultationStatus> statuses);

    // 그 부스·날짜의 시간대별 정원 점유 건수(고객 화면의 잔여 표시용). [preferredTime, count]
    @Query("SELECT c.preferredTime, COUNT(c) FROM Consultation c WHERE c.booth.id = :boothId "
            + "AND c.preferredDate = :date AND c.status IN :statuses GROUP BY c.preferredTime")
    List<Object[]> countByTimeForDate(@Param("boothId") Long boothId, @Param("date") LocalDate date,
                                      @Param("statuses") List<ConsultationStatus> statuses);

    // QR 스캔 리드 생성 시 - 같은 고객+부스+방문일(visitDate=preferredDate)의 승인된 신청을 찾아 리드에 연결(TASK 11-2)
    Optional<Consultation> findByCustomerIdAndBooth_IdAndPreferredDateAndStatus(
            Long customerId, Long boothId, LocalDate preferredDate, ConsultationStatus status);

    // 후기 작성 자격 검증 - 이 부스에서 상담을 완료(COMPLETED)한 적이 있어야 후기를 남길 수 있다.
    // 완료 후 5일 이내인지는 서비스 레이어에서 Consultation.isReviewable()로 판단(updatedAt 기준).
    List<Consultation> findByCustomerIdAndBooth_IdAndStatus(Long customerId, Long boothId, ConsultationStatus status);
}
