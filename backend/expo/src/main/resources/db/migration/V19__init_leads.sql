CREATE TABLE leads (
    id                BIGINT       NOT NULL AUTO_INCREMENT,
    booth_id          BIGINT       NOT NULL,
    customer_id       BIGINT       NOT NULL,
    consultation_id   BIGINT,
    customer_name     VARCHAR(100),
    customer_email    VARCHAR(255),
    interest_note     VARCHAR(1000),
    email_summary     VARCHAR(2000),
    status            VARCHAR(20)  NOT NULL,
    created_at        DATETIME(6)  NOT NULL,
    CONSTRAINT pk_leads PRIMARY KEY (id),
    CONSTRAINT fk_leads_booth FOREIGN KEY (booth_id) REFERENCES booths (id) ON DELETE CASCADE,
    CONSTRAINT fk_leads_consultation FOREIGN KEY (consultation_id) REFERENCES consultations (id),
    CONSTRAINT uk_leads_booth_customer UNIQUE (booth_id, customer_id)
) ENGINE = InnoDB;
