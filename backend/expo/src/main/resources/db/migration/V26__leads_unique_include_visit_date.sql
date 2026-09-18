-- V19의 uk_leads_booth_customer(booth_id, customer_id)가 visit_date 없이 걸려있어,
-- 같은 부스를 다른 날짜(QR)로 재방문해 새 리드를 만들려 하면 중복키 오류가 났다(2026-09-18 확인).
-- 멱등 처리 키를 visit_date까지 포함하도록 맞춘다.
-- 새 UNIQUE를 먼저 추가하고 옛 것을 나중에 지운다 - booth_id는 fk_leads_booth가 참조 중이라,
-- 이 순서를 지키지 않고 옛 인덱스부터 지우면 "그 순간 booth_id를 커버하는 인덱스가 없어져"
-- MySQL이 FK 제약 위반으로 DROP 자체를 거부한다(2026-09-18 로컬에서 확인된 실패 원인).
ALTER TABLE leads
    ADD CONSTRAINT uk_leads_booth_customer_visit_date UNIQUE (booth_id, customer_id, visit_date);

ALTER TABLE leads DROP INDEX uk_leads_booth_customer;
