-- USER 계정에 OAuth 제공자 정보 추가
ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(60) NULL COMMENT 'BCrypt, 소셜 전용 계정은 NULL',
    ADD COLUMN provider VARCHAR(20) NULL COMMENT 'GOOGLE | KAKAO | NAVER, 이메일 가입은 NULL',
    ADD COLUMN provider_id VARCHAR(100) NULL;
