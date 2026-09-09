CREATE TABLE payment_items (
                               id          BIGINT AUTO_INCREMENT PRIMARY KEY,
                               payment_id  BIGINT NOT NULL,
                               booth_id    BIGINT NOT NULL,     -- Expo 서비스 Booth.id 논리 참조(FK 없음)
                               amount      BIGINT NOT NULL,

                               CONSTRAINT fk_payment_items_payment FOREIGN KEY (payment_id) REFERENCES payments (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_payment_items_payment_id ON payment_items (payment_id);