package com.team4.expo.controller;

import com.team4.common.response.ApiResponse;
import com.team4.common.response.PageMeta;
import com.team4.expo.dto.NotificationResponse;
import com.team4.common.security.GatewayUser;
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

@RestController
@RequestMapping("/api/exhibitor/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final NotificationEmitterRegistry notificationEmitterRegistry;

    public NotificationController(NotificationService notificationService, NotificationEmitterRegistry notificationEmitterRegistry) {
        this.notificationService = notificationService;
        this.notificationEmitterRegistry = notificationEmitterRegistry;
    }

    @GetMapping(value = "/stream",produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@AuthenticationPrincipal GatewayUser exhibitor){

        return notificationEmitterRegistry.subscribe(exhibitor.getId());
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageMeta<NotificationResponse>>> listNotifications(
            @AuthenticationPrincipal GatewayUser exhibitor,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                PageMeta.from(notificationService.listNotifications(exhibitor.getId(), pageable))));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> unreadCount(
            @AuthenticationPrincipal GatewayUser exhibitor) {
        return ResponseEntity.ok(ApiResponse.success(Map.of("count", notificationService.countUnread(exhibitor.getId()))));
    }

    @PostMapping("/{notificationId}/read")
    public ResponseEntity<ApiResponse<Void>> markRead(
            @AuthenticationPrincipal GatewayUser exhibitor,
            @PathVariable Long notificationId) {
        notificationService.markRead(exhibitor.getId(), notificationId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllRead(@AuthenticationPrincipal GatewayUser exhibitor) {
        notificationService.markAllRead(exhibitor.getId());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // 읽은 알림 삭제 (안 읽은 알림은 먼저 읽어야 지울 수 있음)
    @DeleteMapping("/{notificationId}")
    public ResponseEntity<ApiResponse<Void>> deleteNotification(
            @AuthenticationPrincipal GatewayUser exhibitor,
            @PathVariable Long notificationId) {
        notificationService.delete(exhibitor.getId(), notificationId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
