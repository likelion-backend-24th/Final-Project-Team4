CREATE TABLE vehicles (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    booth_id    BIGINT       NOT NULL,
    name        VARCHAR(255) NOT NULL,
    tags        VARCHAR(255),
    start_price BIGINT       NOT NULL,
    summary     VARCHAR(255) NOT NULL,
    description VARCHAR(2000) NOT NULL,
    range_info  VARCHAR(50),
    battery     VARCHAR(50),
    power       VARCHAR(50),
    created_at  DATETIME(6)  NOT NULL,
    updated_at  DATETIME(6)  NOT NULL,
    CONSTRAINT pk_vehicles PRIMARY KEY (id),
    CONSTRAINT fk_vehicles_booth FOREIGN KEY (booth_id) REFERENCES booths (id)
) ENGINE = InnoDB;
