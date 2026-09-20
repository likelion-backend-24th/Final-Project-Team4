-- 마이페이지 "내가 쓴 후기"에 어느 업체·박람회에 쓴 후기인지 보여주기 위해 작성 시점의 이름을 함께 저장한다.
-- (상담 없이 QR 방문만으로 쓴 부스후기는 상담 내역으로 업체명을 알 수 없다.) 기존 후기는 NULL로 남는다.
ALTER TABLE reviews
    ADD COLUMN company_name VARCHAR(200) NULL,
    ADD COLUMN expo_title   VARCHAR(200) NULL;
