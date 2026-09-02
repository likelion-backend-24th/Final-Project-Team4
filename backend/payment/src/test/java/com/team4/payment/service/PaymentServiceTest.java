package com.team4.payment.service;

import com.team4.payment.entity.Payment;
import com.team4.payment.entity.PaymentStatus;
import com.team4.payment.repository.PaymentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Test
    void 결제를_생성하면_저장된다() {
        PaymentService paymentService = new PaymentService(paymentRepository);

        Payment payment = Payment.builder()
                .bookingId(1L)
                .userId(100L)
                .expoId(1L)
                .boothId(10L)
                .portonePaymentId("MOCK-1")
                .amount(300_000L)
                .status(PaymentStatus.PENDING)
                .build();

        when(paymentRepository.save(payment)).thenReturn(payment);

        Payment saved = paymentService.createPayment(payment);

        assertThat(saved.getAmount()).isEqualTo(300_000L);
        assertThat(saved.getStatus()).isEqualTo(PaymentStatus.PENDING);
    }
}