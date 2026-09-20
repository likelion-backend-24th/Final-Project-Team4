import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import bellIcon from '../assets/blueBell.svg';

// 알림 종류별 배지 라벨/색상. 참가업체·고객 알림 타입을 모두 여기서 다룬다.
const NOTIFICATION_META = {
  BOOTH_APPROVED: { label: '승인', tone: 'positive' },
  BOOTH_REJECTED: { label: '반려', tone: 'negative' },
  CONSULTATION_RECEIVED: { label: '상담', tone: 'info' },
  CONSULTATION_APPROVED: { label: '확정', tone: 'positive' },
  EXPO_TICKET_CANCELLED: { label: '예약취소', tone: 'negative' },
  EXPO_SCHEDULE_CHANGED: { label: '일정변경', tone: 'info' },
};

// "5분 전" 같은 상대 시간 표시. 하루 넘으면 날짜로.
function formatRelativeTime(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  return new Date(isoString).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

// 헤더의 "알림" 항목 + 드롭다운. 참가업체(Header)·고객(CustomerHeader) 양쪽에서 공유.
// api: api/notifications.js의 exhibitorNotificationApi | customerNotificationApi
// targetMap: 알림 종류(type) -> 클릭 시 이동할 경로
function NotificationBell({ api, targetMap }) {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // 마운트 시 SSE 구독. 새 알림 오면 unreadCount 올리고, 드롭다운 열려있으면 목록 맨 위에 얹음
  useEffect(() => {
    const source = api.subscribe((notification) => {
      setUnreadCount((c) => c + 1);
      setNotifications((prev) => (open ? [notification, ...prev] : prev));
    });
    return () => source.close();
  }, [api]);

  // 알림함 바깥을 클릭하면 닫기
  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      api.getNotifications({ page: 0, size: 20 })
        .then((res) => setNotifications(res.content ?? []))
        .catch(() => setNotifications([]));
    }
  };

  const handleClick = (notification) => {
    setOpen(false);
    if (!notification.read) {
      api.markRead(notification.id)
        .then(() => setUnreadCount((c) => Math.max(0, c - 1)))
        .catch(() => {});
    }
    navigate(targetMap[notification.type] ?? '/');
  };

  // 안 읽은 알림 모두 읽음 처리
  const handleMarkAllRead = () => {
    api.markAllRead()
      .then(() => {
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      })
      .catch(() => {});
  };

  // 읽은 알림 삭제. 목록 클릭(읽음 처리+이동)과 이벤트가 겹치지 않게 버블링을 막는다.
  const handleDelete = (e, notificationId) => {
    e.stopPropagation();
    api.deleteNotification(notificationId)
      .then(() => setNotifications((prev) => prev.filter((n) => n.id !== notificationId)))
      .catch(() => {});
  };

  return (
    <div className="app-header__notifications" ref={ref}>
      <button
        type="button"
        className={`app-header__notifications-trigger${unreadCount > 0 ? ' has-unread' : ''}`}
        onClick={toggle}
        aria-label="알림"
      >
        <img src={bellIcon} alt="" className="app-header__notifications-icon" />
      </button>
      {open && (
        <div className="app-header__notifications-panel">
          <div className="app-header__notifications-panel-head">
            <span>알림</span>
            {unreadCount > 0 && (
              <button type="button" className="app-header__notifications-read-all" onClick={handleMarkAllRead}>
                모두 읽음 ({unreadCount})
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="app-header__notifications-empty">아직 알림이 없습니다.</p>
          ) : (
            <ul>
              {notifications.map((n) => {
                const meta = NOTIFICATION_META[n.type] ?? { label: '알림', tone: 'info' };
                return (
                  <li key={n.id} className={n.read ? '' : 'is-unread'} onClick={() => handleClick(n)}>
                    <span className={`app-header__notification-dot tone-${meta.tone}`} />
                    <div className="app-header__notification-body">
                      <div className="app-header__notification-row">
                        <span className={`app-header__notification-badge tone-${meta.tone}`}>{meta.label}</span>
                        <span className="app-header__notification-time">{formatRelativeTime(n.createdAt)}</span>
                      </div>
                      <p className="app-header__notification-title">{n.title}</p>
                      <p className="app-header__notification-message">{n.message}</p>
                    </div>
                    {n.read && (
                      <button
                        type="button"
                        className="app-header__notification-delete"
                        aria-label="알림 삭제"
                        onClick={(e) => handleDelete(e, n.id)}
                      >
                        ×
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
