-- Identity 서비스 스키마
CREATE TABLE users (
    id            BIGINT         NOT NULL AUTO_INCREMENT,
    email         VARCHAR(255)   NOT NULL,
    password_hash VARCHAR(60)    NOT NULL                COMMENT 'BCrypt',
    role          VARCHAR(20)    NOT NULL                COMMENT 'USER | EXHIBITOR | ADMIN',
    status        VARCHAR(20)    NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE | LOCKED | WITHDRAWN',
    business_no   VARCHAR(32)    NULL                    COMMENT '사업자등록번호(하이픈 제거)',
    company_name  VARCHAR(255)   NULL,
    manager_name  VARCHAR(100)   NULL,
    contact_enc   VARCHAR(512)   NULL                    COMMENT '담당자 연락처 암호화 저장',
    created_at    DATETIME(6)    NOT NULL,
    updated_at    DATETIME(6)    NOT NULL,
    CONSTRAINT pk_users             PRIMARY KEY (id),
    CONSTRAINT uk_users_email       UNIQUE (email),
    CONSTRAINT uk_users_business_no UNIQUE (business_no)
) ENGINE = InnoDB;
