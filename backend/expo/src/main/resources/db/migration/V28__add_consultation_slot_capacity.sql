-- 참가업체가 날짜/시간 슬롯마다 받을 상담 건수를 지정한다.
-- booths.consultation_capacity: 슬롯별 지정이 없을 때 쓰는 부스 기본값(기본 1건).
-- consultation_slot_capacities: 특정 날짜·시간만 다른 값으로 덮어쓴다(0이면 그 슬롯 마감).
ALTER TABLE booths
    ADD COLUMN consultation_capacity INT NOT NULL DEFAULT 1;

CREATE TABLE consultation_slot_capacities (
    id         BIGINT NOT NULL AUTO_INCREMENT,
    booth_id   BIGINT NOT NULL,
    slot_date  DATE   NOT NULL,
    slot_time  TIME   NOT NULL,
    capacity   INT    NOT NULL,
    CONSTRAINT pk_consultation_slot_capacities PRIMARY KEY (id),
    CONSTRAINT uk_consultation_slot UNIQUE (booth_id, slot_date, slot_time),
    CONSTRAINT fk_consultation_slot_booth FOREIGN KEY (booth_id) REFERENCES booths (id) ON DELETE CASCADE
) ENGINE = InnoDB;
