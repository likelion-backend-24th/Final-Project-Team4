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
                .bookingId("group-1")
                .userId(100L)
                .expoId(1L)
                .portonePaymentId("MOCK-TEST-1")
                .payMethod("CARD")
                .amount(300_000L)
                .status(PaymentStatus.PENDING)
                .build();
        payment.addItem(10L, 300_000L);

        paymentRepository.save(payment);

        Optional<Payment> found = paymentRepository.findByBookingId("group-1");

        assertThat(found).isPresent();
        assertThat(found.get().getAmount()).isEqualTo(300_000L);
        assertThat(found.get().getStatus()).isEqualTo(PaymentStatus.PENDING);
        assertThat(found.get().getItems()).hasSize(1);
    }

    @Test
    void 같은_bookingId로_저장하면_중복여부를_확인할_수_있다() {
        Payment payment = Payment.builder()
                .bookingId("group-2")
                .userId(100L)
                .expoId(1L)
                .portonePaymentId("MOCK-TEST-2")
                .payMethod("CARD")
                .amount(300_000L)
                .status(PaymentStatus.PENDING)
                .build();
        payment.addItem(11L, 300_000L);
        paymentRepository.save(payment);

        assertThat(paymentRepository.existsByBookingId("group-2")).isTrue();
    }
}