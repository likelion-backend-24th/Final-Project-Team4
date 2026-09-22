package com.team4.payment.repository;

import com.team4.payment.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    // 예약(bookingId) 기준으로 결제 내역 조회 (마이 페이지 결제 상태 확인용)
    Optional<Payment> findByBookingId(String bookingId);
    // 예약 고유 번호 중복 여부 확인
    boolean existsByBookingId(String bookingId);

    // 특정 사용자의 결제 내역 전체 조회
    List<Payment> findByUserIdOrderByCreatedAtDesc(Long userId);

    // 박람회별 부스 참가비 결제 총액(한 번이라도 결제 완료된 건 - PAID 또는 CANCELLED)
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.expoId = :expoId " +
            "AND p.status IN (com.team4.payment.entity.PaymentStatus.PAID, com.team4.payment.entity.PaymentStatus.CANCELLED)")
    long sumPaidAmountByExpoId(Long expoId);

    // 박람회별 부스 참가비 환불 총액(전액 환불만 있어서 CANCELLED 건 amount가 곧 환불액)
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.expoId = :expoId " +
            "AND p.status = com.team4.payment.entity.PaymentStatus.CANCELLED")
    long sumRefundAmountByExpoId(Long expoId);

    // 통계용 - 일별 부스 참가비 결제 건수,금액(결제일 = created_at 기준)
    @Query(value = "SELECT DATE(created_at) AS day, COUNT(*) AS cnt, COALESCE(SUM(amount), 0) AS amt " +
            "FROM payments " +
            "WHERE expo_id = :expoId AND status IN ('PAID', 'CANCELLED') " +
            "AND created_at >= :from AND created_at < :toExclusive " +
            "GROUP BY DATE(created_at)", nativeQuery = true)
    List<DailyAmountCount> findDailyPaidByExpoId(Long expoId, LocalDateTime from, LocalDateTime toExclusive);

    // 통계용 - 일별 부스 참가비 환불 건수,금액(환불일 = cancelled_at 기준)
    @Query(value = "SELECT DATE(cancelled_at) AS day, COUNT(*) AS cnt, COALESCE(SUM(amount), 0) AS amt " +
            "FROM payments " +
            "WHERE expo_id = :expoId AND status = 'CANCELLED' " +
            "AND cancelled_at >= :from AND cancelled_at < :toExclusive " +
            "GROUP BY DATE(cancelled_at)", nativeQuery = true)
    List<DailyAmountCount> findDailyRefundedByExpoId(Long expoId, LocalDateTime from, LocalDateTime toExclusive);
}