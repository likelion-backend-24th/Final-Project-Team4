-- 당일(단일 날짜) 유료 입장권 결제를 무료 방문예약처럼 다중 날짜 선택 후 일괄 결제하는 방식으로 재설계.
-- 결제 1건 : 티켓 N건(날짜별)로 바뀌어 admission_payments에 직접 두던 ticket_id/qr_token을
-- 별도 테이블(admission_payment_tickets)로 분리한다.
ALTER TABLE admission_payments
    DROP COLUMN ticket_id,
    DROP COLUMN qr_token;

CREATE TABLE admission_payment_tickets (
    id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
    admission_payment_id  BIGINT NOT NULL,
    visit_date            DATE NOT NULL,
    ticket_id             BIGINT NOT NULL,   -- Reservation 서비스 Ticket.id 논리 참조(FK 없음)
    qr_token              VARCHAR(36) NOT NULL,

    CONSTRAINT fk_admission_payment_tickets_payment
        FOREIGN KEY (admission_payment_id) REFERENCES admission_payments (id),
    CONSTRAINT uk_admission_payment_tickets_payment_date UNIQUE (admission_payment_id, visit_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_admission_payment_tickets_payment_id ON admission_payment_tickets (admission_payment_id);
