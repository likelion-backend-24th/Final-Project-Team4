package com.team4.payment.repository;

import com.team4.payment.entity.AdmissionPayment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AdmissionPaymentRepository extends JpaRepository<AdmissionPayment, Long> {

    // 동일 고객, 동일 박람회 중복 결제 여부 확인
    boolean existsByCustomerIdAndExpoId(Long customerId, Long expoId);

    // 특정 고객의 특정 박라회 당일 입장권 결제 내역 조회
    Optional<AdmissionPayment> findByCustomerIdAndExpoId(Long customerId, long expoId);
}
