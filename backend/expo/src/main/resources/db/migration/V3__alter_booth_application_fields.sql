ALTER TABLE booth_applications
    DROP COLUMN company_name,
    DROP COLUMN manager_name,
    DROP COLUMN contact,
    DROP COLUMN intro,
    ADD COLUMN exhibition_item        VARCHAR(255) NOT NULL AFTER exhibitor_id,
    ADD COLUMN concept_description    VARCHAR(255) NOT NULL AFTER exhibition_item,
    ADD COLUMN power_requested        TINYINT(1)   NOT NULL DEFAULT 0 AFTER concept_description,
    ADD COLUMN water_supply_requested TINYINT(1)   NOT NULL DEFAULT 0 AFTER power_requested,
    ADD COLUMN internet_requested     TINYINT(1)   NOT NULL DEFAULT 0 AFTER water_supply_requested,
    ADD COLUMN additional_request     VARCHAR(255) NULL AFTER internet_requested;
