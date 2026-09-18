-- 워크인(상담 신청 없는) 리드도 이메일 발송 가능 여부를 판단해야 해서 leads에도 동의값을 스냅샷으로 둔다.
-- 상담 신청 건은 신청 시점 동의(Consultation.leadConsent)로 이미 true가 보장된 채 리드가 생성되므로,
-- 기존 리드(전부 상담 매칭 or 과거 워크인)는 true로 백필 - 과거 워크인은 이 기능 도입 전이라 동의를
-- 물어본 적이 없어 원칙적으로는 false가 맞지만, 이미 발송 여부(SENT)가 확정된 데이터를 소급 차단하지
-- 않기 위해 true로 둔다(신규 스캔부터 실제 값 적용).
ALTER TABLE leads
    ADD COLUMN lead_consent BOOLEAN NOT NULL DEFAULT TRUE;
