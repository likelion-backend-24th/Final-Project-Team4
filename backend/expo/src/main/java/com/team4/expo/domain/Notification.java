package com.team4.expo.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;

// 사용자(참가업체·고객 등)에게 노출되는 알림 1건 (부스 신청 심사 결과, 신규 상담 접수, 상담 승인 등).
// recipientId는 역할과 무관하게 그 알림을 받을 사용자의 id — 어느 역할이냐는 호출한 API 경로(컨트롤러)가 결정한다.
@Entity
@Table(name = "notifications")
@Getter
@NoArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long recipientId;

    @Enumerated(EnumType.STRING)
    private NotificationType type;

    private String title;
    private String message;

    // 알림이 가리키는 대상(부스 신청 id, 상담 id 등). 클릭 시 화면 이동에 쓰며 없을 수 있다.
    private Long relatedId;

    private boolean isRead;

    private LocalDateTime createdAt;

    public Notification(Long recipientId, NotificationType type, String title, String message, Long relatedId) {
        this.recipientId = recipientId;
        this.type = type;
        this.title = title;
        this.message = message;
        this.relatedId = relatedId;
        this.isRead = false;
        this.createdAt = LocalDateTime.now();
    }

    public void markRead() {
        this.isRead = true;
    }
}
