package com.team4.common.error;

public enum ErrorCode {

    VALIDATION_ERROR(400, "요청 값이 올바르지 않습니다."),
    UNAUTHENTICATED(401, "인증이 필요합니다."),
    FORBIDDEN(403, "권한이 없습니다."),
    NOT_FOUND(404, "대상을 찾을 수 없습니다."),
    INVALID_STATE(409, "현재 상태에서 처리할 수 없습니다."),
    DUPLICATE(409, "이미 존재합니다."),
    PAYMENT_EXPIRED(409, "결제 기한이 지났습니다."),
    DEPENDENCY_TIMEOUT(202, "처리 중입니다. 잠시 후 다시 확인해 주세요."),
    INTERNAL_ERROR(500, "서버 내부 오류입니다."),

    // 결제(payment) 전용 에러코드
    PAYMENT_ALREADY_COMPLETED(409, "이미 결제가 완료된 예약입니다."),
    PAYMENT_AMOUNT_MISMATCH(400, "결제 금액이 참가비와 일치하지 않습니다.");

    private final int httpStatus;
    private final String defaultMessage;

    ErrorCode(int httpStatus, String defaultMessage) {
        this.httpStatus = httpStatus;
        this.defaultMessage = defaultMessage;
    }

    public int httpStatus() {
        return httpStatus;
    }

    public String defaultMessage() {
        return defaultMessage;
    }
}
