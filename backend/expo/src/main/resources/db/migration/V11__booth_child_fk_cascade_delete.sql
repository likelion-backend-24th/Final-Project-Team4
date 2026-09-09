ALTER TABLE vehicle_images DROP FOREIGN KEY fk_vehicle_images_vehicle;
ALTER TABLE vehicle_images
    ADD CONSTRAINT fk_vehicle_images_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE CASCADE;

ALTER TABLE vehicles DROP FOREIGN KEY fk_vehicles_booth;
ALTER TABLE vehicles
    ADD CONSTRAINT fk_vehicles_booth FOREIGN KEY (booth_id) REFERENCES booths (id) ON DELETE CASCADE;

ALTER TABLE posts DROP FOREIGN KEY fk_posts_booth;
ALTER TABLE posts
    ADD CONSTRAINT fk_posts_booth FOREIGN KEY (booth_id) REFERENCES booths (id) ON DELETE CASCADE;
