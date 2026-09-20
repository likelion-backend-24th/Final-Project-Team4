import apiClient, {apiBaseUrl} from './client';
import { EventSourcePolyfill } from 'event-source-polyfill';
import {getToken} from './auth';

// 참가업체(/api/exhibitor/notifications)·고객(/api/customer/notifications) 양쪽이 같은 모양의 API라
// basePath만 다르게 받는 팩토리로 공유한다.
const createNotificationApi = (basePath) => ({
  // GET {basePath} - 내 알림 목록 최신순 조회 (페이징)
  getNotifications: (params) => apiClient.get(basePath, { params }).then((res) => res.data.data),

  // GET {basePath}/unread-count - 안 읽은 알림 개수 (헤더 강조 표시용)
  getUnreadCount: () => apiClient.get(`${basePath}/unread-count`).then((res) => res.data.data.count),

  // POST {basePath}/{id}/read - 알림 읽음 처리
  markRead: (notificationId) => apiClient.post(`${basePath}/${notificationId}/read`).then((res) => res.data.data),

  // POST {basePath}/read-all - 안 읽은 알림 모두 읽음 처리
  markAllRead: () => apiClient.post(`${basePath}/read-all`).then((res) => res.data.data),

  // DELETE {basePath}/{id} - 읽은 알림 삭제 (안 읽은 알림은 서버에서 거부됨)
  deleteNotification: (notificationId) => apiClient.delete(`${basePath}/${notificationId}`).then((res) => res.data.data),

  // SSE 구독. 새 알림 오면 onNotification(payload) 호출. 반환값의 close()로 구독 해제
  subscribe: (onNotification) => {
    const source = new EventSourcePolyfill(`${apiBaseUrl}${basePath}/stream`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      heartbeatTimeout: 60000,
    });
    source.addEventListener('notification', (e) => onNotification(JSON.parse(e.data)));
    return source;
  },
});

export const exhibitorNotificationApi = createNotificationApi('/api/exhibitor/notifications');
export const customerNotificationApi = createNotificationApi('/api/customer/notifications');
