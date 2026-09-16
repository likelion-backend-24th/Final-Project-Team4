package com.team4.expo.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.expo.domain.Notification;
import com.team4.expo.domain.NotificationType;
import com.team4.expo.dto.NotificationResponse;
import com.team4.expo.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 참가업체 알림 생성/조회/읽음 처리 (TASK 13-1)
@Service
@Transactional
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    // 알림 생성은 부가 기능이라 실패해도 호출부(부스 신청 승인/반려, 상담 접수)의 처리를 막지 않는다(fail-open).
    public void notify(Long exhibitorId, NotificationType type, String title, String message, Long relatedId) {
        try {
            notificationRepository.save(new Notification(exhibitorId, type, title, message, relatedId));
        } catch (Exception e) {
            log.warn("알림 생성 실패 (exhibitorId={}, type={}): {}", exhibitorId, type, e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public Page<NotificationResponse> listNotifications(Long exhibitorId, Pageable pageable) {
        return notificationRepository.findByExhibitorId(exhibitorId, pageable)
                .map(NotificationResponse::from);
    }

    @Transactional(readOnly = true)
    public long countUnread(Long exhibitorId) {
        return notificationRepository.countByExhibitorIdAndIsReadFalse(exhibitorId);
    }

    // 본인 알림만 읽음 처리 가능
    public void markRead(Long exhibitorId, Long notificationId) {
        Notification notification = findOwned(exhibitorId, notificationId);
        notification.markRead();
    }

    // 읽은 알림만 삭제 가능 (안 읽은 알림은 먼저 읽어야 지울 수 있음)
    public void delete(Long exhibitorId, Long notificationId) {
        Notification notification = findOwned(exhibitorId, notificationId);
        if (!notification.isRead()) {
            throw new CustomException(ErrorCode.INVALID_STATE, "읽은 알림만 삭제할 수 있습니다.");
        }
        notificationRepository.delete(notification);
    }

    private Notification findOwned(Long exhibitorId, Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "알림을 찾을 수 없습니다."));
        if (!notification.getExhibitorId().equals(exhibitorId)) {
            throw new CustomException(ErrorCode.FORBIDDEN, "본인 알림이 아닙니다.");
        }
        return notification;
    }
}
