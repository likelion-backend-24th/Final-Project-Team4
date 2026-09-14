package com.team4.payment.gateway;

/**
 * 결제 연동 인터페이스.
 */
public interface PaymentGateway {

    // 결제 요청.
    PaymentGatewayResult requestPayment(String paymentId, String bookingId, Long amount);

    // 결제 취소(환불) 요청. amount는 부분 취소 금액 — 여러 날짜를 한 번에 결제한 건 중 한 날짜만
    // 환불할 때는 전체 결제 금액이 아니라 그 날짜분만 넘긴다(포트원 부분 취소).
    RefundResult cancelPayment(String paymentId, Long amount, String reason);

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

    // 결제 취소(환불) 결과 담은 record (성공 or 실패 사유)
    record RefundResult(boolean success, String failureReason) {

        public static RefundResult succeeded() {
            return new RefundResult(true, null);
        }

        public static RefundResult failure(String reason) {
            return new RefundResult(false, reason);
        }
    }
}