-- 일반회원(USER) 가입 정보 이름 추가 - (전화번호는 기존 담당자 연락처 contact 재사용)
ALTER TABLE users
    ADD COLUMN name VARCHAR(100) NULL;
