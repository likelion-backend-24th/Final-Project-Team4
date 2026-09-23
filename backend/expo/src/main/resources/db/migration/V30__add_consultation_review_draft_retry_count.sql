ALTER TABLE consultations
    ADD COLUMN review_draft_retry_count INT NOT NULL DEFAULT 0;
