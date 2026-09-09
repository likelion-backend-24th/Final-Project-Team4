ALTER TABLE vehicles
    ADD COLUMN features VARCHAR(2000) AFTER description,
    ADD COLUMN colors VARCHAR(2000) AFTER features;
