package com.team4.payment.repository;

import com.team4.payment.entity.AdmissionPaymentTicket;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdmissionPaymentTicketRepository extends JpaRepository<AdmissionPaymentTicket, Long> {

    // 조회 즉시 소유자(customerId) 확인을 위해 부모 AdmissionPayment까지 같이 가져온다(N+1 방지).
    @EntityGraph(attributePaths = "admissionPayment")
    Optional<AdmissionPaymentTicket> findByTicketId(Long ticketId);
}
