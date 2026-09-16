package com.team4.expo.repository;

import com.team4.expo.domain.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByExhibitorId(Long exhibitorId, Pageable pageable);

    long countByExhibitorIdAndIsReadFalse(Long exhibitorId);
}
