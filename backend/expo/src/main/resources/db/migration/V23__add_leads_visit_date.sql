ALTER TABLE leads
    ADD COLUMN visit_date DATE NULL AFTER customer_id;

-- 기존 리드 백필: 상담 연결된 건은 그 상담의 방문 예정일, 워크인 건은 스캔한 날을 방문일로 간주.
UPDATE leads l
    LEFT JOIN consultations c ON c.id = l.consultation_id
    SET l.visit_date = COALESCE(c.preferred_date, DATE(l.created_at));

ALTER TABLE leads
    MODIFY COLUMN visit_date DATE NOT NULL;
