package com.team4.payment.gateway;

/**
 * 결제 연동 인터페이스.
 */
public interface PaymentGateway {

    // 결제 요청.
    PaymentGatewayResult requestPayment(String paymentId, String bookingId, Long amount);

    // 결제 요청 결과 담은 record (성공 or 실패 사유)
    record PaymentGatewayResult(boolean success, String failureReason){

        // 성공 결과 메서드
        public static PaymentGatewayResult succeeded(){
            return new PaymentGatewayResult(true, null);
        }

        // 실패 결과 메서드
        public static PaymentGatewayResult failure(String reason){
            return new PaymentGatewayResult(false, reason);
        }
    }
}
