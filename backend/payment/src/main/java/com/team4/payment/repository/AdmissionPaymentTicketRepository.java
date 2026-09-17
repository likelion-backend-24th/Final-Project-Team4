package com.team4.payment.repository;

import com.team4.payment.entity.AdmissionPaymentTicket;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface AdmissionPaymentTicketRepository extends JpaRepository<AdmissionPaymentTicket, Long> {

    // 조회 즉시 소유자(customerId) 확인을 위해 부모 AdmissionPayment까지 같이 가져온다(N+1 방지).
    @EntityGraph(attributePaths = "admissionPayment")
    Optional<AdmissionPaymentTicket> findByTicketId(Long ticketId);

    // 박람회별 당일 입장권 환불 집계 - 날짜 단위 부분 환불이 반영된 금액 합
    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM AdmissionPaymentTicket t WHERE t.admissionPayment.expoId = :expoId AND t.refundedAt IS NOT NULL")
    long sumRefundedAmountByExpoId(Long expoId);
}
