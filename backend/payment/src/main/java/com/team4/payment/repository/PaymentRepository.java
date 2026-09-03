package com.team4.payment.repository;

import com.team4.payment.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    // 예약(bookingId) 기준으로 결제 내역 조회 (마이 페이지 결제 상태 확인용)
    Optional<Payment> findByBookingId(Long bookingId);
    // 예약 고유 번호 중복 여부 확인
    boolean existsByBookingId(Long bookingId);

    // 포트원 거래 고유 번호로 조회
    Optional<Payment> findByPortonePaymentId(String portonePaymentId);
    // 거래 고유 번호 중복 여부 확인
    boolean existsByPortonePaymentId(String portonePaymentId);
}
