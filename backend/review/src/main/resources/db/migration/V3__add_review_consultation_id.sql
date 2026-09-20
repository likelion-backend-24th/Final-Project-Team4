-- 상담후기는 상담 1건당 1개만 작성할 수 있어서 어느 상담에 대한 후기인지 저장한다(부스후기는 NULL).
-- 기존 후기는 NULL로 남고, MySQL 유니크 인덱스는 NULL을 여러 개 허용하므로 기존 데이터에 영향이 없다.
ALTER TABLE reviews
    ADD COLUMN consultation_id BIGINT NULL;

CREATE UNIQUE INDEX uk_reviews_consultation ON reviews (consultation_id);
