CREATE TABLE booth_applications (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    booth_id      BIGINT       NOT NULL,
    exhibitor_id  BIGINT       NOT NULL,
    company_name  VARCHAR(255) NOT NULL,
    manager_name  VARCHAR(255) NOT NULL,
    contact       VARCHAR(255) NOT NULL,
    intro         VARCHAR(255),
    status        VARCHAR(20)  NOT NULL COMMENT 'SUBMITTED | PAYMENT_PENDING | CONFIRMED | REJECTED | REFUND_REQUIRED',
    reject_reason VARCHAR(255),
    submitted_at  DATETIME(6)  NOT NULL,
    CONSTRAINT pk_booth_applications PRIMARY KEY (id),
    CONSTRAINT fk_booth_applications_booth FOREIGN KEY (booth_id) REFERENCES booths (id)
) ENGINE = InnoDB;
