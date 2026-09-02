package com.team4.payment.service;

import com.team4.payment.entity.Payment;
import com.team4.payment.gateway.PaymentGateway;
import com.team4.payment.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {
    private final PaymentRepository paymentRepository;

    // 결제 도메인 저장.
    @Transactional
    public Payment createPayment(Payment payment){
        return paymentRepository.save(payment);
    }

    public Optional<Payment> findByBookingId(Long bookingId){
        return paymentRepository.findByBookingId(bookingId);
    }
}
