-- booths.status에 RESERVED(관리자 승인 완료, 결제 대기) 상태 추가.
-- CHECK 제약이 없는 VARCHAR 컬럼이라 기존 값에는 영향 없음, 주석만 갱신.
ALTER TABLE booths
    MODIFY COLUMN status VARCHAR(20) NOT NULL COMMENT 'AVAILABLE | RESERVED | ASSIGNED';
