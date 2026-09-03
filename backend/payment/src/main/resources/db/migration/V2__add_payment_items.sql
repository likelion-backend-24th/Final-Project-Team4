create table payment_items(
    id          BIGINT      NOT NULL AUTO_INCREMENT,
    payment_id  BIGINT      NOT NULL                COMMENT '어느 결제에 속한 항목인지 (payments.id)',
    booth_id    BIGINT      NOT NULL                COMMENT '부스 ID',
    amount      BIGINT      NOT NULL                COMMENT '해당 부스 1건의 참가비',
    CONSTRAINT pk_payment_items PRIMARY KEY (id),
    CONSTRAINT fk_payment_items_payment FOREIGN KEY (payment_id) REFERENCES payments(id)
) ENGINE = InnoDB;