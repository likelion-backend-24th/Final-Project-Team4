ALTER TABLE consultations
    DROP FOREIGN KEY fk_consultations_vehicle,
    DROP COLUMN vehicle_id,
    ADD COLUMN customer_name        VARCHAR(100) NOT NULL DEFAULT '',
    ADD COLUMN customer_phone       VARCHAR(30)  NOT NULL DEFAULT '',
    ADD COLUMN customer_email       VARCHAR(150) NOT NULL DEFAULT '',
    ADD COLUMN interested_vehicle   VARCHAR(200),
    ADD COLUMN has_driver_license   BOOLEAN      NOT NULL DEFAULT FALSE;
