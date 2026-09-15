-- fk_leads_consultation이 ON DELETE CASCADE 없이 생성돼(V19), 부스 삭제가 consultations로 cascade될 때
-- 그 consultation을 참조하는 leads 행 때문에 FK violation으로 막히는 문제(다른 테스트의 booth/expo 정리 실패).
-- consultation_id는 nullable(워크인 리드는 연결 없음)이라 CASCADE로 바꿔도 안전 - consultation이 지워지면 그 리드도 같이 지운다.
ALTER TABLE leads DROP FOREIGN KEY fk_leads_consultation;

ALTER TABLE leads
    ADD CONSTRAINT fk_leads_consultation FOREIGN KEY (consultation_id) REFERENCES consultations (id) ON DELETE CASCADE;
