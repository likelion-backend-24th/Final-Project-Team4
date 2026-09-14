ALTER TABLE consultations
    ADD COLUMN ai_summary_retry_count INT NOT NULL DEFAULT 0;
