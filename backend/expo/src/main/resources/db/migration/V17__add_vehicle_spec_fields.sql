ALTER TABLE vehicles
    ADD COLUMN brand VARCHAR(100) NULL,
    ADD COLUMN category VARCHAR(100) NULL,
    ADD COLUMN drivetrain VARCHAR(50) NULL,
    ADD COLUMN charging_type VARCHAR(100) NULL,
    ADD COLUMN charging_time VARCHAR(100) NULL,
    ADD COLUMN dimensions VARCHAR(100) NULL,
    ADD COLUMN weight VARCHAR(50) NULL,
    ADD COLUMN seating_capacity INT NULL;