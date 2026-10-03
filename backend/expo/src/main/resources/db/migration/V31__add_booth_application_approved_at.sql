-- 부스 신청 승인 시각. 승인 후 3일 안에 결제하지 않으면 자동 반려하는 기준으로 사용
ALTER TABLE booth_applications
    ADD COLUMN approved_at DATETIME(6) NULL;

-- 이미 승인 대기 중인 신청은 지금부터 3일을 줌
UPDATE booth_applications SET approved_at = NOW(6) WHERE status = 'PAYMENT_PENDING';
