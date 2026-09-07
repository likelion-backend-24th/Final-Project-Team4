-- 참가업체 가입 필드 추가
-- 연락처 필드명 변경 contact_enc -> contact
ALTER TABLE users
    CHANGE COLUMN contact_enc contact VARCHAR(32) NULL,
    ADD COLUMN industry           VARCHAR(100) NULL,
    ADD COLUMN company_address    VARCHAR(255) NULL,
    ADD COLUMN representative_name VARCHAR(100) NULL,
    ADD COLUMN company_contact    VARCHAR(32)  NULL;
