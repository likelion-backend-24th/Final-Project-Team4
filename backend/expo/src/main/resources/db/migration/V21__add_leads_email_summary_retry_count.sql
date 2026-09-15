ALTER TABLE leads
    ADD COLUMN email_summary_retry_count INT NOT NULL DEFAULT 0;
