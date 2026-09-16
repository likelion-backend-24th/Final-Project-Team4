CREATE TABLE reviews (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    booth_id      BIGINT       NOT NULL,
    booth_no      VARCHAR(50)  NOT NULL,
    review_type   VARCHAR(20)  NOT NULL,
    customer_id   BIGINT       NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    vehicle_name  VARCHAR(200),
    content       VARCHAR(1000) NOT NULL,
    created_at    DATETIME(6)  NOT NULL,
    CONSTRAINT pk_reviews PRIMARY KEY (id)
) ENGINE = InnoDB;

CREATE INDEX idx_reviews_booth_type ON reviews (booth_id, review_type);
