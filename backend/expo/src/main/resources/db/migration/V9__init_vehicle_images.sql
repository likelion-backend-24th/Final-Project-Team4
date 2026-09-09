CREATE TABLE vehicle_images (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    vehicle_id  BIGINT       NOT NULL,
    image_url   VARCHAR(255) NOT NULL,
    sort_order  INT          NOT NULL,
    created_at  DATETIME(6)  NOT NULL,
    CONSTRAINT pk_vehicle_images PRIMARY KEY (id),
    CONSTRAINT fk_vehicle_images_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
) ENGINE = InnoDB;
