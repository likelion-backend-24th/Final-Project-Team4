import apiClient from './client';

// GET /api/exhibitor/notifications - 내 알림 목록 최신순 조회 (페이징)
export const getNotifications = (params) =>
  apiClient.get('/api/exhibitor/notifications', { params }).then((res) => res.data.data);

// GET /api/exhibitor/notifications/unread-count - 안 읽은 알림 개수 (헤더 강조 표시용)
export const getUnreadNotificationCount = () =>
  apiClient.get('/api/exhibitor/notifications/unread-count').then((res) => res.data.data.count);

// POST /api/exhibitor/notifications/{id}/read - 알림 읽음 처리
export const markNotificationRead = (notificationId) =>
  apiClient.post(`/api/exhibitor/notifications/${notificationId}/read`).then((res) => res.data.data);

// DELETE /api/exhibitor/notifications/{id} - 읽은 알림 삭제 (안 읽은 알림은 서버에서 거부됨)
export const deleteNotification = (notificationId) =>
  apiClient.delete(`/api/exhibitor/notifications/${notificationId}`).then((res) => res.data.data);
