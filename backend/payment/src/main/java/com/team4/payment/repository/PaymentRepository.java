package com.team4.payment.repository;

import com.team4.payment.entity.Payment;
import com.team4.payment.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    // 예약(bookingId) 기준으로 결제 내역 조회 (마이 페이지 결제 상태 확인용)
    Optional<Payment> findByBookingId(String bookingId);
    // 예약 고유 번호 중복 여부 확인
    boolean existsByBookingId(String bookingId);

    // 포트원 거래 고유 번호로 조회
    Optional<Payment> findByPortonePaymentId(String portonePaymentId);
    // 거래 고유 번호 중복 여부 확인
    boolean existsByPortonePaymentId(String portonePaymentId);

    // 특정 사용자의 결제 내역 전체 조회
    List<Payment> findByUserIdOrderByCreatedAtDesc(Long userId);

    // 박람회별 부스 참가비 매출/환불 집계 - (PAID, CANCELLED)면 결제 총액, CANCELLED만이면 환불액
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.expoId = :expoId AND p.status IN :statuses")
    long sumAmountByExpoIdAndStatusIn(Long expoId, Collection<PaymentStatus> statuses);
}