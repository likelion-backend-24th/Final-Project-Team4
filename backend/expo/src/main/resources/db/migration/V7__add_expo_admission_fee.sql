-- 박람회 시작 이후 방문객이 내는 당일 입장료. 기존 행은 관리자가 등록할 당시 몰랐던 값이라 0(무료)로 백필.
ALTER TABLE expos
    ADD COLUMN admission_fee BIGINT NOT NULL DEFAULT 0;
