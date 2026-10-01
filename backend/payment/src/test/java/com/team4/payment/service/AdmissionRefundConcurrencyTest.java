package com.team4.payment.service;

import com.team4.payment.client.ReservationClient;
import com.team4.payment.entity.AdmissionPayment;
import com.team4.payment.entity.AdmissionPaymentTicket;
import com.team4.payment.entity.PaymentStatus;
import com.team4.payment.gateway.PaymentGateway;
import com.team4.payment.repository.AdmissionPaymentRepository;
import com.team4.payment.repository.AdmissionPaymentTicketRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.concurrent.CompletableFuture;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// 같은 입장권에 환불 요청이 동시에 들어와도 PortOne 부분 취소는 한 번만 나가야 함
@SpringBootTest
@ActiveProfiles("test")
class AdmissionRefundConcurrencyTest {

    @Autowired
    private AdmissionPaymentService admissionPaymentService;
    @Autowired
    private AdmissionPaymentRepository admissionPaymentRepository;
    @Autowired
    private AdmissionPaymentTicketRepository admissionPaymentTicketRepository;

    @MockBean
    private ReservationClient reservationClient;
    @MockBean
    private PaymentGateway paymentGateway;

    @Test
    void 같은_입장권을_동시에_환불하면_PortOne_취소는_한_번만_나간다() {
        long customerId = 7001L;
        long ticketId = System.nanoTime(); // 다른 테스트 데이터와 겹치지 않게 함

        AdmissionPayment payment = admissionPaymentRepository.save(AdmissionPayment.builder()
                .customerId(customerId)
                .expoId(7001L)
                .portonePaymentId("MOCK-REFUND-" + ticketId)
                .payMethod("CARD")
                .amount(20_000L)
                .status(PaymentStatus.PAID)
                .build());
        admissionPaymentTicketRepository.save(AdmissionPaymentTicket.builder()
                .admissionPayment(payment)
                .visitDate(LocalDate.now().plusDays(1))
                .ticketId(ticketId)
                .qrToken("qr-refund-" + ticketId)
                .amount(10_000L)
                .build());

        // reservation 취소는 멱등이라 두 번 와도 true, PortOne 취소는 항상 성공한다고 가정
        when(reservationClient.cancelTicket(anyLong())).thenReturn(true);
        when(paymentGateway.cancelPayment(anyString(), any(), any())).thenReturn(PaymentGateway.RefundResult.succeeded());

        CompletableFuture<Void> r1 = CompletableFuture.runAsync(() -> refundQuietly(customerId, ticketId));
        CompletableFuture<Void> r2 = CompletableFuture.runAsync(() -> refundQuietly(customerId, ticketId));
        CompletableFuture.allOf(r1, r2).join();

        verify(paymentGateway, times(1)).cancelPayment(anyString(), any(), any());
    }

    // 두 번째 요청은 이미 환불된 입장권 예외가 정상이라 무시
    private void refundQuietly(long customerId, long ticketId) {
        try {
            admissionPaymentService.refundTicket(customerId, ticketId, "동시 환불 테스트");
        } catch (RuntimeException ignored) {
        }
    }
}
