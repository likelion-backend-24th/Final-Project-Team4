ALTER TABLE booth_applications
    DROP COLUMN company_name,
    DROP COLUMN manager_name,
    DROP COLUMN contact,
    DROP COLUMN intro,
    ADD COLUMN exhibit_item VARCHAR(255) NOT NULL DEFAULT '' AFTER exhibitor_id,
    ADD COLUMN concept_description VARCHAR(255) NOT NULL DEFAULT '' AFTER exhibit_item,
    ADD COLUMN facility_power TINYINT(1) NOT NULL DEFAULT 0 AFTER concept_description,
    ADD COLUMN facility_water TINYINT(1) NOT NULL DEFAULT 0 AFTER facility_power,
    ADD COLUMN facility_internet TINYINT(1) NOT NULL DEFAULT 0 AFTER facility_water,
    ADD COLUMN additional_request VARCHAR(255) AFTER facility_internet;

ALTER TABLE booth_applications
    ALTER COLUMN exhibit_item DROP DEFAULT,
    ALTER COLUMN concept_description DROP DEFAULT,
    ALTER COLUMN facility_power DROP DEFAULT,
    ALTER COLUMN facility_water DROP DEFAULT,
    ALTER COLUMN facility_internet DROP DEFAULT;
