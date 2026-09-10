package com.team4.identity.auth.mail;

// 트랜잭션 메일 발송 추상화
public interface MailSender {

    void send(String to, String subject, String body);
}
