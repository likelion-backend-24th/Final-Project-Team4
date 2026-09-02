package com.team4.payment.repository;

import com.team4.payment.entity.Payment;
import com.team4.payment.entity.PaymentStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
public class PaymentRepositoryTest {

    @Autowired
    private PaymentRepository paymentRepository;

    @Test
    void 결제를_저장하고_bookingId로_조회할_수_있다() {
        Payment payment = Payment.builder()
                .bookingId(1L)
                .userId(100L)
                .expoId(1L)
                .boothId(10L)
                .portonePaymentId("MOCK-TEST-1")
                .payMethod("CARD")
                .amount(300_000L)
                .status(PaymentStatus.PENDING)
                .build();

        paymentRepository.save(payment);

        Optional<Payment> found = paymentRepository.findByBookingId(1L);

        assertThat(found).isPresent();
        assertThat(found.get().getAmount()).isEqualTo(300_000L);
        assertThat(found.get().getStatus()).isEqualTo(PaymentStatus.PENDING);
    }

    @Test
    void 같은_bookingId로_저장하면_중복여부를_확인할_수_있다() {
        Payment payment = Payment.builder()
                .bookingId(2L)
                .userId(100L)
                .expoId(1L)
                .boothId(10L)
                .portonePaymentId("MOCK-TEST-2")
                .payMethod("CARD")
                .amount(300_000L)
                .status(PaymentStatus.PENDING)
                .build();
        paymentRepository.save(payment);

        assertThat(paymentRepository.existsByBookingId(2L)).isTrue();
    }
}