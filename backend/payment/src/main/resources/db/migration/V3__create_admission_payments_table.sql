CREATE TABLE admission_payments (
                                    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
                                    customer_id         BIGINT NOT NULL,             -- Identity 서비스 User.id 논리 참조(FK 없음) — 결제한 방문객
                                    expo_id             BIGINT NOT NULL,              -- Expo 서비스 논리 참조(FK 없음)
                                    portone_payment_id  VARCHAR(255) NOT NULL,
                                    pay_method          VARCHAR(50) NULL,
                                    amount              BIGINT NOT NULL,
                                    status              VARCHAR(20) NOT NULL,
                                    approved_at         DATETIME NULL,
                                    cancelled_at        DATETIME NULL,
                                    cancel_reason       VARCHAR(255) NULL,
                                    ticket_id           BIGINT NULL,                  -- Reservation 서비스 Ticket.id 논리 참조(FK 없음) — 결제 실패/취소 시엔 NULL
                                    qr_token            VARCHAR(36) NULL,              -- Reservation이 발급한 UUID qrToken 그대로 저장
                                    created_at          DATETIME NOT NULL,
                                    updated_at          DATETIME NOT NULL,

                                    CONSTRAINT uk_admission_payment_customer_expo UNIQUE (customer_id, expo_id),
                                    CONSTRAINT uk_admission_payments_portone_payment_id UNIQUE (portone_payment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_admission_payments_customer_id ON admission_payments (customer_id);
CREATE INDEX idx_admission_payments_expo_id ON admission_payments (expo_id);