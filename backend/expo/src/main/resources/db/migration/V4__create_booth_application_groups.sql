CREATE TABLE booth_application_groups (
    id                     VARCHAR(36)  NOT NULL,
    exhibitor_id           BIGINT       NOT NULL,
    expo_id                BIGINT       NOT NULL,
    exhibition_item        VARCHAR(255) NOT NULL,
    concept_description    VARCHAR(255) NOT NULL,
    power_requested        TINYINT(1)   NOT NULL DEFAULT 0,
    water_supply_requested TINYINT(1)   NOT NULL DEFAULT 0,
    internet_requested     TINYINT(1)   NOT NULL DEFAULT 0,
    additional_request     VARCHAR(255),
    created_at             DATETIME(6)  NOT NULL,
    CONSTRAINT pk_booth_application_groups PRIMARY KEY (id),
    CONSTRAINT fk_booth_application_groups_expo FOREIGN KEY (expo_id) REFERENCES expos (id)
) ENGINE = InnoDB;

CREATE INDEX idx_booth_application_groups_exhibitor_id ON booth_application_groups (exhibitor_id);

ALTER TABLE booth_applications
    ADD COLUMN group_id VARCHAR(36) NULL AFTER exhibitor_id;

-- 기존 신청 건은 부스 1개 = 그룹 1개로 백필 (다중 선택 이전에 생성된 데이터)
UPDATE booth_applications
SET group_id = UUID()
WHERE group_id IS NULL;

INSERT INTO booth_application_groups (
    id, exhibitor_id, expo_id, exhibition_item, concept_description,
    power_requested, water_supply_requested, internet_requested, additional_request, created_at
)
SELECT
    ba.group_id, ba.exhibitor_id, b.expo_id, ba.exhibition_item, ba.concept_description,
    ba.power_requested, ba.water_supply_requested, ba.internet_requested, ba.additional_request, ba.submitted_at
FROM booth_applications ba
JOIN booths b ON b.id = ba.booth_id;

ALTER TABLE booth_applications
    MODIFY COLUMN group_id VARCHAR(36) NOT NULL,
    ADD CONSTRAINT fk_booth_applications_group FOREIGN KEY (group_id) REFERENCES booth_application_groups (id),
    DROP COLUMN exhibition_item,
    DROP COLUMN concept_description,
    DROP COLUMN power_requested,
    DROP COLUMN water_supply_requested,
    DROP COLUMN internet_requested,
    DROP COLUMN additional_request,
    MODIFY COLUMN status VARCHAR(20) NOT NULL COMMENT 'DRAFT | SUBMITTED | PAYMENT_PENDING | CONFIRMED | REJECTED | REFUND_REQUIRED | CANCELLED';

CREATE INDEX idx_booth_applications_group_id ON booth_applications (group_id);
