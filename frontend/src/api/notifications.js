import apiClient from './client';

// 참가업체(/api/exhibitor/notifications)·고객(/api/customer/notifications) 양쪽이 같은 모양의 API라
// basePath만 다르게 받는 팩토리로 공유한다.
const createNotificationApi = (basePath) => ({
  // GET {basePath} - 내 알림 목록 최신순 조회 (페이징)
  getNotifications: (params) => apiClient.get(basePath, { params }).then((res) => res.data.data),

  // GET {basePath}/unread-count - 안 읽은 알림 개수 (헤더 강조 표시용)
  getUnreadCount: () => apiClient.get(`${basePath}/unread-count`).then((res) => res.data.data.count),

  // POST {basePath}/{id}/read - 알림 읽음 처리
  markRead: (notificationId) => apiClient.post(`${basePath}/${notificationId}/read`).then((res) => res.data.data),

  // DELETE {basePath}/{id} - 읽은 알림 삭제 (안 읽은 알림은 서버에서 거부됨)
  deleteNotification: (notificationId) => apiClient.delete(`${basePath}/${notificationId}`).then((res) => res.data.data),
});

export const exhibitorNotificationApi = createNotificationApi('/api/exhibitor/notifications');
export const customerNotificationApi = createNotificationApi('/api/customer/notifications');
