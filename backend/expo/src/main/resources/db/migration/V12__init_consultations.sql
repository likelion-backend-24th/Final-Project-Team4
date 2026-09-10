CREATE TABLE consultations (
    id                BIGINT       NOT NULL AUTO_INCREMENT,
    booth_id          BIGINT       NOT NULL,
    vehicle_id        BIGINT       NOT NULL,
    customer_id       BIGINT       NOT NULL,
    wants_purchase    BOOLEAN      NOT NULL,
    wants_test_drive  BOOLEAN      NOT NULL,
    preferred_date    DATE         NOT NULL,
    preferred_time    TIME         NOT NULL,
    message           VARCHAR(1000),
    status            VARCHAR(20)  NOT NULL,
    reject_reason     VARCHAR(500),
    created_at        DATETIME(6)  NOT NULL,
    updated_at        DATETIME(6)  NOT NULL,
    CONSTRAINT pk_consultations PRIMARY KEY (id),
    CONSTRAINT fk_consultations_booth FOREIGN KEY (booth_id) REFERENCES booths (id) ON DELETE CASCADE,
    CONSTRAINT fk_consultations_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE CASCADE
) ENGINE = InnoDB;
