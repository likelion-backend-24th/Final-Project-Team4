package com.team4.payment.gateway;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

// 데모/로컬 기본 결제 게이트웨이. 항상 성공 처리.
@Component
@Primary
public class MockPaymentGateway implements PaymentGateway{

    private static final String FORCE_FAIL_PREFIX = "FORCE_FAIL";

    @Override
    public PaymentGatewayResult requestPayment(String paymentId, String bookingId, Long amount){
        if (paymentId != null && paymentId.startsWith(FORCE_FAIL_PREFIX)) {
            return PaymentGatewayResult.failure("테스트로 강제 실패 처리됨 (paymentId=" + paymentId + ")");
        }
        return PaymentGatewayResult.succeeded();
    }
}
