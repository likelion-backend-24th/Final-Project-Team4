package com.team4.reservation.repository;

import com.team4.reservation.domain.Ticket;
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

    // 체크인할 때 QR 스캔값(qrToken)으로 대상 티켓을 찾는 용도.
    Optional<Ticket> findByQrToken(String qrToken);

    // 체크인 시 단일 사용 보장용 조건부 UPDATE.
    @Modifying
    @Query("UPDATE Ticket t SET t.status = com.team4.reservation.domain.TicketStatus.USED, t.usedAt = :usedAt "
            + "WHERE t.id = :id AND t.status = com.team4.reservation.domain.TicketStatus.ISSUED")
    int markUsedIfIssued(@Param("id") Long id, @Param("usedAt") LocalDateTime usedAt); // 반환값 0 = 이미 사용됨/취소됨(호출부에서 409 처리)
}
