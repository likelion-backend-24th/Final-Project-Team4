package com.team4.payment.repository;

import com.team4.payment.entity.AdmissionPayment;
import com.team4.payment.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;

public interface AdmissionPaymentRepository extends JpaRepository<AdmissionPayment, Long> {

    // 박람회별 당일 입장권 매출 집계 - (PAID, CANCELLED)면 결제 총액
    @Query("SELECT COALESCE(SUM(a.amount), 0) FROM AdmissionPayment a WHERE a.expoId = :expoId AND a.status IN :statuses")
    long sumAmountByExpoIdAndStatusIn(Long expoId, Collection<PaymentStatus> statuses);
}
