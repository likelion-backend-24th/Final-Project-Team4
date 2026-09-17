package com.team4.payment.repository;

import com.team4.payment.entity.AdmissionPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;

public interface AdmissionPaymentRepository extends JpaRepository<AdmissionPayment, Long> {

    // 박람회별 당일 입장권 결제 총액(한 번이라도 결제 완료된 건 - PAID 또는 CANCELLED)
    @Query("SELECT COALESCE(SUM(a.amount), 0) FROM AdmissionPayment a WHERE a.expoId = :expoId " +
            "AND a.status IN (com.team4.payment.entity.PaymentStatus.PAID, com.team4.payment.entity.PaymentStatus.CANCELLED)")
    long sumPaidAmountByExpoId(Long expoId);

    // 통계용 - 일별 당일 입장권 결제 건수,금액(결제일 = created_at 기준)
    @Query(value = "SELECT DATE(created_at) AS day, COUNT(*) AS cnt, COALESCE(SUM(amount), 0) AS amt " +
            "FROM admission_payments " +
            "WHERE expo_id = :expoId AND status IN ('PAID', 'CANCELLED') " +
            "AND created_at >= :from AND created_at < :toExclusive " +
            "GROUP BY DATE(created_at)", nativeQuery = true)
    List<DailyAmountCount> findDailyPaidByExpoId(Long expoId, LocalDateTime from, LocalDateTime toExclusive);
}
