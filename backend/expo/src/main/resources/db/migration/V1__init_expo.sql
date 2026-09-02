CREATE TABLE expos (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    title           VARCHAR(255) NOT NULL,
    venue           VARCHAR(255) NOT NULL,
    starts_at       DATETIME(6)  NOT NULL,
    ends_at         DATETIME(6)  NOT NULL,
    apply_starts_at DATETIME(6)  NOT NULL,
    apply_ends_at   DATETIME(6)  NOT NULL,
    status          VARCHAR(20)  NOT NULL COMMENT 'DRAFT | OPEN',
    created_at      DATETIME(6)  NOT NULL,
    updated_at      DATETIME(6)  NOT NULL,
    CONSTRAINT pk_expos PRIMARY KEY (id)
) ENGINE = InnoDB;

CREATE TABLE booths (
    id       BIGINT      NOT NULL AUTO_INCREMENT,
    expo_id  BIGINT      NOT NULL,
    booth_no VARCHAR(50) NOT NULL,
    type     VARCHAR(50) NOT NULL,
    fee      INT         NOT NULL,
    status   VARCHAR(20) NOT NULL COMMENT 'AVAILABLE | ASSIGNED',
    CONSTRAINT pk_booths PRIMARY KEY (id),
    CONSTRAINT fk_booths_expo FOREIGN KEY (expo_id) REFERENCES expos (id),
    CONSTRAINT uk_booths_expo_booth_no UNIQUE (expo_id, booth_no)
) ENGINE = InnoDB;
