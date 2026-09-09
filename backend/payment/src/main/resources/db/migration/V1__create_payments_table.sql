CREATE TABLE payments (
                          id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
                          booking_id          VARCHAR(255) NOT NULL,      -- Reservation(부스 참가 신청 그룹) 논리 참조(FK 없음, 다른 서비스 ID는 FK 금지 규칙)
                          user_id             BIGINT NOT NULL,             -- Identity 서비스 User.id 논리 참조(FK 없음) — 결제한 참가업체
                          expo_id             BIGINT NOT NULL,             -- Expo 서비스 논리 참조(FK 없음)
                          portone_payment_id  VARCHAR(255) NOT NULL,       -- 포트원(또는 Mock) 거래 고유 번호
                          pay_method          VARCHAR(50) NULL,
                          amount              BIGINT NOT NULL,
                          status              VARCHAR(20) NOT NULL,        -- PENDING | PAID | FAILED | CANCELLED (com.team4.payment.entity.PaymentStatus)
                          approved_at         DATETIME NULL,
                          cancelled_at        DATETIME NULL,
                          cancel_reason       VARCHAR(255) NULL,
                          created_at          DATETIME NOT NULL,
                          updated_at          DATETIME NOT NULL,

                          CONSTRAINT uk_payments_booking_id UNIQUE (booking_id),
                          CONSTRAINT uk_payments_portone_payment_id UNIQUE (portone_payment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_payments_user_id ON payments (user_id);
CREATE INDEX idx_payments_expo_id ON payments (expo_id);