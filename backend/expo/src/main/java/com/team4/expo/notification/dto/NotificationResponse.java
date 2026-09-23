package com.team4.expo.notification.dto;

import com.team4.expo.notification.domain.Notification;
import com.team4.expo.notification.domain.NotificationType;
import java.time.LocalDateTime;
import lombok.Getter;

@Getter
public class NotificationResponse {

    private final Long id;
    private final NotificationType type;
    private final String title;
    private final String message;
    private final Long relatedId;
    private final boolean isRead;
    private final LocalDateTime createdAt;

    public NotificationResponse(Long id, NotificationType type, String title, String message,
                                 Long relatedId, boolean isRead, LocalDateTime createdAt) {
        this.id = id;
        this.type = type;
        this.title = title;
        this.message = message;
        this.relatedId = relatedId;
        this.isRead = isRead;
        this.createdAt = createdAt;
    }

    public static NotificationResponse from(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getType(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getRelatedId(),
                notification.isRead(),
                notification.getCreatedAt()
        );
    }
}
