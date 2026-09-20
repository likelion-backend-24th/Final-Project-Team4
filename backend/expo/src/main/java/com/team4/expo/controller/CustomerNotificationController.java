package com.team4.expo.controller;

import com.team4.common.response.ApiResponse;
import com.team4.common.response.PageMeta;
import com.team4.expo.dto.NotificationResponse;
import com.team4.expo.security.GatewayUser;
import com.team4.expo.service.NotificationEmitterRegistry;
import com.team4.expo.service.NotificationService;
import java.util.Map;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

// 고객용 알림 API. NotificationController(참가업체용)와 동일한 구조, 같은 NotificationService를 공유한다.
@RestController
@RequestMapping("/api/customer/notifications")
public class CustomerNotificationController {

    private final NotificationService notificationService;
    private final NotificationEmitterRegistry notificationEmitterRegistry;

    public CustomerNotificationController(NotificationService notificationService, NotificationEmitterRegistry notificationEmitterRegistry) {
        this.notificationService = notificationService;
        this.notificationEmitterRegistry =notificationEmitterRegistry;
    }

    @GetMapping(value = "/stream",produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@AuthenticationPrincipal GatewayUser customer){

        return notificationEmitterRegistry.subscribe(customer.getId());
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageMeta<NotificationResponse>>> listNotifications(
            @AuthenticationPrincipal GatewayUser customer,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                PageMeta.from(notificationService.listNotifications(customer.getId(), pageable))));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> unreadCount(
            @AuthenticationPrincipal GatewayUser customer) {
        return ResponseEntity.ok(ApiResponse.success(Map.of("count", notificationService.countUnread(customer.getId()))));
    }

    @PostMapping("/{notificationId}/read")
    public ResponseEntity<ApiResponse<Void>> markRead(
            @AuthenticationPrincipal GatewayUser customer,
            @PathVariable Long notificationId) {
        notificationService.markRead(customer.getId(), notificationId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllRead(@AuthenticationPrincipal GatewayUser customer) {
        notificationService.markAllRead(customer.getId());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // 읽은 알림 삭제 (안 읽은 알림은 먼저 읽어야 지울 수 있음)
    @DeleteMapping("/{notificationId}")
    public ResponseEntity<ApiResponse<Void>> deleteNotification(
            @AuthenticationPrincipal GatewayUser customer,
            @PathVariable Long notificationId) {
        notificationService.delete(customer.getId(), notificationId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
