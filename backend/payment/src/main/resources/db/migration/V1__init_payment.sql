Create table payments (
    id          BIGINT      NOT NULL  AUTO_INCREMENT,
    booking_id  BIGINT      NOT NULL                           COMMENT '결제 대상 예약(참가 신청) ID',
    user_id     BIGINT      NOT NULL                           COMMENT '결제한 참가업체(사용자)'
    expo_id              BIGINT        NOT NULL                COMMENT '박람회 ID',
    booth_id             BIGINT        NOT NULL                COMMENT '부스 ID',
    portone_payment_id   VARCHAR(64)   NOT NULL                COMMENT '포트원(또는 MOCK) 거래 고유 번호',
    pay_method           VARCHAR(30)   NULL,
    amount               BIGINT        NOT NULL,
    status               VARCHAR(20)   NOT NULL                COMMENT 'PENDING | PAID | FAILED | CANCELLED',
    approved_at          DATETIME(6)   NULL,
    cancelled_at         DATETIME(6)   NULL,
    cancel_reason        VARCHAR(255)  NULL,
    created_at           DATETIME(6)   NOT NULL,
    updated_at           DATETIME(6)   NOT NULL,
    CONSTRAINT pk_payments                    PRIMARY KEY (id),
    CONSTRAINT uk_payments_booking_id         UNIQUE (booking_id),
    CONSTRAINT uk_payments_portone_payment_id UNIQUE (portone_payment_id)
) ENGINE = InnoDB;