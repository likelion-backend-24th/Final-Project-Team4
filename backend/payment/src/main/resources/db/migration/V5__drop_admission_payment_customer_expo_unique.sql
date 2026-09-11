-- "고객당 박람회당 결제 1건" 제약을 폐기. 이제 재구매 방지는 날짜 단위로만 한다
-- (Reservation의 blockedDates — 이미 티켓을 가진 날짜만 막음). 날짜가 겹치지만 않으면
-- 같은 고객이 같은 박람회를 여러 번 나눠 결제할 수 있어야 하므로 이 유니크 제약은 더 이상 맞지 않음.
ALTER TABLE admission_payments
    DROP INDEX uk_admission_payment_customer_expo;
