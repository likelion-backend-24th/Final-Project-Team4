package com.team4.payment.repository;

import com.team4.payment.entity.AdmissionPayment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdmissionPaymentRepository extends JpaRepository<AdmissionPayment, Long> {
}
