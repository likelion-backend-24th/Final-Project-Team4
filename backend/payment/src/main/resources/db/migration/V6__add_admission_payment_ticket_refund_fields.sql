-- 입장권 환불 기능: 날짜별 티켓(admission_payment_tickets)에 구매 금액 스냅샷 + 환불 처리 컬럼 추가.
-- amount는 일단 nullable로 추가한 뒤 기존 행을 백필하고 나서 NOT NULL로 좁힌다
-- (이미 결제된 건들도 있으므로 처음부터 NOT NULL로 추가하면 마이그레이션이 실패한다).
ALTER TABLE admission_payment_tickets
    ADD COLUMN amount BIGINT NULL,
    ADD COLUMN refunded_at DATETIME NULL,
    ADD COLUMN refund_reason VARCHAR(200) NULL;

-- 기존 행 백필: 같은 결제(admission_payment_id)에 딸린 티켓 수로 결제 총액을 균등 분배.
-- 지금까지는 "1일 입장료 × 날짜 수"로만 결제했으므로 날짜별 금액은 항상 동일해 나머지 없이 나눠떨어진다.
UPDATE admission_payment_tickets t
    JOIN (
    SELECT admission_payment_id, COUNT(*) AS ticket_count
    FROM admission_payment_tickets
    GROUP BY admission_payment_id
    ) c ON c.admission_payment_id = t.admission_payment_id
    JOIN admission_payments p ON p.id = t.admission_payment_id
    SET t.amount = p.amount / c.ticket_count
WHERE t.amount IS NULL;

ALTER TABLE admission_payment_tickets
    MODIFY COLUMN amount BIGINT NOT NULL;