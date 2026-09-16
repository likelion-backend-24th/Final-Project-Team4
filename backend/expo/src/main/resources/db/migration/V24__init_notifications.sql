CREATE TABLE notifications (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    exhibitor_id  BIGINT       NOT NULL,
    type          VARCHAR(50)  NOT NULL,
    title         VARCHAR(200) NOT NULL,
    message       VARCHAR(500) NOT NULL,
    related_id    BIGINT       NULL,
    is_read       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at    DATETIME(6)  NOT NULL
);

CREATE INDEX idx_notifications_exhibitor ON notifications (exhibitor_id, created_at);
