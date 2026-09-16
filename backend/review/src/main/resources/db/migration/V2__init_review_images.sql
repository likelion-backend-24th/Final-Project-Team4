CREATE TABLE review_images (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    review_id   BIGINT       NOT NULL,
    image_url   VARCHAR(255) NOT NULL,
    sort_order  INT          NOT NULL,
    created_at  DATETIME(6)  NOT NULL,
    CONSTRAINT pk_review_images PRIMARY KEY (id),
    CONSTRAINT fk_review_images_review FOREIGN KEY (review_id) REFERENCES reviews (id) ON DELETE CASCADE
) ENGINE = InnoDB;
