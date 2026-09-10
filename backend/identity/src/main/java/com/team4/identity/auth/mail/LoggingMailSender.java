package com.team4.identity.auth.mail;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

// 임시 - 메일 발송 로그로 출력
@Slf4j
@Component
public class LoggingMailSender implements MailSender {

    @Override
    public void send(String to, String subject, String body) {
        log.info("[MAIL] to={}, subject={}\n{}", to, subject, body);
    }
}
