package com.team4.expo.notification.repository;

import com.team4.expo.notification.domain.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByRecipientId(Long recipientId, Pageable pageable);

    long countByRecipientIdAndIsReadFalse(Long recipientId);

    // 내 안 읽은 알림을 한 번에 읽음 처리
    @Modifying
    @Query("update Notification n set n.isRead = true where n.recipientId = :recipientId and n.isRead = false")
    void markAllRead(@Param("recipientId") Long recipientId);
}
