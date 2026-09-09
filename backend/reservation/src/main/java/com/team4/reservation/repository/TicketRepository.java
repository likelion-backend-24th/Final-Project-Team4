package com.team4.reservation.repository;

import com.team4.reservation.domain.Ticket;
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

    // 이 고객이 이 박람회의 이 날짜 티켓을 이미 받았는지 — 방문 예약 신청의 멱등 체크에 씀.
    Optional<Ticket> findByCustomerIdAndExpoIdAndVisitDate(Long customerId, Long expoId, LocalDate visitDate);

    // 마이페이지 "나의 입장권" 목록 조회 — 최근 발급 순.
    List<Ticket> findByCustomerIdOrderByIssuedAtDesc(Long customerId);

    // 이 고객이 이 박람회의 "오늘" 날짜에 해당 타입 티켓을 갖고 있는지 — Payment가 당일 결제 전에 물어보는 값.
    // 날짜 무관하게 판정하면 다른 날짜 무료 QR로 당일 유료 입장을 우회할 수 있어 반드시 visitDate까지 맞춰야 함.
    boolean existsByCustomerIdAndExpoIdAndTicketTypeAndVisitDate(
            Long customerId, Long expoId, TicketType ticketType, LocalDate visitDate);

    // 체크인할 때 QR 스캔값(qrToken)으로 대상 티켓을 찾는 용도.
    Optional<Ticket> findByQrToken(String qrToken);

    // 체크인 시 단일 사용 보장용 조건부 UPDATE.
    @Modifying
    @Query("UPDATE Ticket t SET t.status = com.team4.reservation.domain.TicketStatus.USED, t.usedAt = :usedAt "
            + "WHERE t.id = :id AND t.status = com.team4.reservation.domain.TicketStatus.ISSUED")
    int markUsedIfIssued(@Param("id") Long id, @Param("usedAt") LocalDateTime usedAt); // 반환값 0 = 이미 사용됨/취소됨(호출부에서 409 처리)
}
