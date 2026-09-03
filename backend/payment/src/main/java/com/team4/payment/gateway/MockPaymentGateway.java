package com.team4.payment.gateway;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

// 데모/로컬 기본 결제 게이트웨이. 항상 성공 처리.
@Component
@Primary
public class MockPaymentGateway implements PaymentGateway{

    @Override
    public PaymentGatewayResult requestPayment(String paymentId, String bookingId, Long amount){
        return PaymentGatewayResult.succeeded();
    }
}
