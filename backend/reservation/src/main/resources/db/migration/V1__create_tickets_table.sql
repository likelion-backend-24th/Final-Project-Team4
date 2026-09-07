CREATE TABLE tickets (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT NOT NULL,              -- Identity 서비스 User.id 논리 참조(FK 없음, 다른 서비스 ID는 FK 금지 규칙)
    expo_id     BIGINT NOT NULL,               -- Expo 서비스 논리 참조(FK 없음) — 이 티켓이 어느 박람회 방문용인지
    visit_date  DATE NOT NULL,                 -- 방문 예약한 날짜. 같은 박람회라도 날짜가 다르면 별도 티켓(별도 QR).
    ticket_type VARCHAR(20) NOT NULL,          -- 지금은 'FREE'뿐 (com.team4.reservation.domain.TicketType)
    status      VARCHAR(20) NOT NULL,          -- ISSUED | USED | CANCELLED (com.team4.reservation.domain.TicketStatus)
    qr_token    VARCHAR(36) NOT NULL,          -- UUID 문자열 길이(36자) 고정. QR에 인코딩되는 실제 값.
    issued_at   DATETIME NOT NULL,
    used_at     DATETIME NULL,                 -- 체크인 전엔 NULL. CheckInService의 UPDATE가 이 컬럼만 직접 채움.
    created_at  DATETIME NOT NULL,
    updated_at  DATETIME NOT NULL,

    -- qr_token은 애초에 UUID라 애플리케이션 레벨에서 충돌이 거의 안 나지만, "거의"를 "절대"로 만들어주는 DB 제약.
    CONSTRAINT uk_tickets_qr_token UNIQUE (qr_token),
    -- (customer_id, expo_id, visit_date) 조합당 1장만 허용 — 같은 박람회를 같은 날짜로 두 번 신청해도 중복 발급 안 됨.
    -- TicketService가 이 제약에 기대어 "동시에 두 요청이 와도 결국 DB가 하나만 통과시켜준다"는 보장을 얻음.
    CONSTRAINT uk_tickets_customer_expo_date UNIQUE (customer_id, expo_id, visit_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_tickets_customer_id ON tickets (customer_id);
CREATE INDEX idx_tickets_expo_id ON tickets (expo_id);
