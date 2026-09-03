CREATE TABLE posts (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    booth_id   BIGINT       NOT NULL,
    title      VARCHAR(255) NOT NULL,
    content    VARCHAR(2000) NOT NULL,
    created_at DATETIME(6)  NOT NULL,
    updated_at DATETIME(6)  NOT NULL,
    CONSTRAINT pk_posts PRIMARY KEY (id),
    CONSTRAINT fk_posts_booth FOREIGN KEY (booth_id) REFERENCES booths (id),
    CONSTRAINT uk_posts_booth UNIQUE (booth_id)
) ENGINE = InnoDB;

ALTER TABLE booths
    ADD COLUMN banner_image_url VARCHAR(255) NULL AFTER status;
