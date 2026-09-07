-- 참가업체 가입 시 업종, 업체 주소
ALTER TABLE users
    ADD COLUMN industry        VARCHAR(100) NULL,
    ADD COLUMN company_address VARCHAR(255) NULL;
