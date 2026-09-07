CREATE TABLE check_ins (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    ticket_id     BIGINT NOT NULL,
    expo_id       BIGINT NOT NULL, -- Expo 서비스 논리 참조(FK 없음) — 다른 서비스 소유 데이터라 물리적 FK 안 걸음
    checked_in_at DATETIME NOT NULL,

    CONSTRAINT fk_check_ins_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_check_ins_ticket_id ON check_ins (ticket_id);
