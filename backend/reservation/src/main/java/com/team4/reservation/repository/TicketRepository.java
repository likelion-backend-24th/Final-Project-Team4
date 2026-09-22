package com.team4.reservation.repository;

import com.team4.reservation.domain.Ticket;
import com.team4.reservation.domain.TicketStatus;
import com.team4.reservation.domain.TicketType;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TicketRepository extends JpaRepository<Ticket, Long> {

    // 이 고객이 이 박람회의 이 날짜 티켓을 이미 받았는지 — 방문 예약 신청의 멱등 체크·상담 신청 접수 조건 확인에 씀.
    Optional<Ticket> findByCustomerIdAndExpoIdAndVisitDate(Long customerId, Long expoId, LocalDate visitDate);

    // 마이페이지 "나의 입장권" 목록 조회 — 최근 발급 순.
    List<Ticket> findByCustomerIdOrderByIssuedAtDesc(Long customerId);

    // 체크인할 때 QR 스캔값(qrToken)으로 대상 티켓을 찾는 용도.
    Optional<Ticket> findByQrToken(String qrToken);

    // 체크인 시 단일 사용 보장용 조건부 UPDATE.
    @Modifying
    @Query("UPDATE Ticket t SET t.status = com.team4.reservation.domain.TicketStatus.USED, t.usedAt = :usedAt "
            + "WHERE t.id = :id AND t.status = com.team4.reservation.domain.TicketStatus.ISSUED")
    int markUsedIfIssued(@Param("id") Long id, @Param("usedAt") LocalDateTime usedAt); // 반환값 0 = 이미 사용됨/취소됨(호출부에서 409 처리)

    // 환불 처리(Payment -> Reservation)용 조건부 UPDATE. ISSUED 상태일 때만 CANCELLED로 바꾼다 —
    // 이미 USED인 티켓은 그대로 두고 0을 반환해 호출부(TicketService.cancelTicket)가 환불 불가로 처리하게 한다.
    @Modifying
    @Query("UPDATE Ticket t SET t.status = com.team4.reservation.domain.TicketStatus.CANCELLED "
            + "WHERE t.id = :id AND t.status = com.team4.reservation.domain.TicketStatus.ISSUED")
    int markCancelledIfIssued(@Param("id") Long id);

    // 박람회 일정 변경(Expo -> Reservation)용 - 알림 발송 대상(전체) 추리려고 취소 전에 먼저 조회.
    List<Ticket> findByExpoIdAndStatus(Long expoId, TicketStatus status);

    // 회원 탈퇴(Identity -> Reservation)용 - 그 고객의 ISSUED 티켓을 전부 CANCELLED로.
    // 이미 USED인 티켓(체크인 완료)은 조건에서 빠져 그대로 남는다 - 이미 입장 완료된 기록이라 무효화 대상이 아님.
    @Modifying
    @Query("UPDATE Ticket t SET t.status = com.team4.reservation.domain.TicketStatus.CANCELLED "
            + "WHERE t.customerId = :customerId AND t.status = com.team4.reservation.domain.TicketStatus.ISSUED")
    int cancelAllIssuedByCustomerId(@Param("customerId") Long customerId);

    // 위에서 조회한 것들 중 새 개최 기간([newStart, newEnd]) 밖으로 벗어난 것만 CANCELLED로 변경.
    @Modifying
    @Query("UPDATE Ticket t SET t.status = com.team4.reservation.domain.TicketStatus.CANCELLED "
            + "WHERE t.expoId = :expoId AND t.status = com.team4.reservation.domain.TicketStatus.ISSUED "
            + "AND (t.visitDate < :newStart OR t.visitDate > :newEnd)")
    int cancelOutOfRangeByExpoId(@Param("expoId") Long expoId, @Param("newStart") LocalDate newStart, @Param("newEnd") LocalDate newEnd);

    // Identity 회원 관리(참관객) 화면 - 여러 고객의 "최종 입장(체크인) 시각"을 한 번에 집계.
    // 체크인 이력이 전혀 없는 고객은 결과 자체에 나타나지 않음(호출부에서 없으면 미체크인으로 간주).
    @Query("SELECT t.customerId AS customerId, MAX(t.usedAt) AS lastCheckedInAt FROM Ticket t "
            + "WHERE t.customerId IN :customerIds AND t.status = com.team4.reservation.domain.TicketStatus.USED "
            + "GROUP BY t.customerId")
    List<CustomerLastCheckInProjection> findLastCheckInByCustomerIds(@Param("customerIds") List<Long> customerIds);
    // 통계용 - 유형별 유효 발급 수(취소된 티켓 제외), 체크인 완료(USED) 수
    long countByExpoIdAndTicketTypeAndStatusNot(Long expoId, TicketType ticketType, TicketStatus status);

    long countByExpoIdAndStatus(Long expoId, TicketStatus status);

}
