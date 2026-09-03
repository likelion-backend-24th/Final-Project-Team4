package com.team4.payment.gateway;

import org.springframework.stereotype.Component;

@Component
public class MockPaymentGateway implements PaymentGateway{

    @Override
    public PaymentGatewayResult requestPayment(String paymentId, Long bookingId, Long amount){
        return PaymentGatewayResult.succeeded();
    }
}
