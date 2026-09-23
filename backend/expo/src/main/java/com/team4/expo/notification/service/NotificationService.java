package com.team4.expo.notification.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.expo.notification.domain.Notification;
import com.team4.expo.notification.domain.NotificationType;
import com.team4.expo.notification.dto.NotificationResponse;
import com.team4.expo.notification.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 사용자(참가업체·고객) 알림 생성/조회/읽음 처리 (TASK 13-1, 역할 무관하게 recipientId 기준으로 동작)
@Service
@Transactional
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;
    private final NotificationEmitterRegistry notificationEmitterRegistry;

    public NotificationService(NotificationRepository notificationRepository, NotificationEmitterRegistry notificationEmitterRegistry) {
        this.notificationRepository = notificationRepository;
        this.notificationEmitterRegistry = notificationEmitterRegistry;
    }

    // 알림 생성은 부가 기능이라 실패해도 호출부(부스 신청 승인/반려, 상담 접수/승인 등)의 처리를 막지 않는다(fail-open).
    public void notify(Long recipientId, NotificationType type, String title, String message, Long relatedId) {
        try {
            Notification saved = notificationRepository.save(new Notification(recipientId, type, title, message, relatedId));
            // notify()에서 알림 저장 후 push()로 흘려보내는 흐름
            notificationEmitterRegistry.push(recipientId, NotificationResponse.from(saved));
        } catch (Exception e) {
            log.warn("알림 생성 실패 (recipientId={}, type={}): {}", recipientId, type, e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public Page<NotificationResponse> listNotifications(Long recipientId, Pageable pageable) {
        return notificationRepository.findByRecipientId(recipientId, pageable)
                .map(NotificationResponse::from);
    }

    @Transactional(readOnly = true)
    public long countUnread(Long recipientId) {
        return notificationRepository.countByRecipientIdAndIsReadFalse(recipientId);
    }

    // 본인 알림만 읽음 처리 가능
    public void markRead(Long recipientId, Long notificationId) {
        Notification notification = findOwned(recipientId, notificationId);
        notification.markRead();
    }

    // 내 안 읽은 알림 모두 읽음 처리
    public void markAllRead(Long recipientId) {
        notificationRepository.markAllRead(recipientId);
    }

    // 읽은 알림만 삭제 가능 (안 읽은 알림은 먼저 읽어야 지울 수 있음)
    public void delete(Long recipientId, Long notificationId) {
        Notification notification = findOwned(recipientId, notificationId);
        if (!notification.isRead()) {
            throw new CustomException(ErrorCode.INVALID_STATE, "읽은 알림만 삭제할 수 있습니다.");
        }
        notificationRepository.delete(notification);
    }

    private Notification findOwned(Long recipientId, Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "알림을 찾을 수 없습니다."));
        if (!notification.getRecipientId().equals(recipientId)) {
            throw new CustomException(ErrorCode.FORBIDDEN, "본인 알림이 아닙니다.");
        }
        return notification;
    }
}
