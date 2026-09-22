import { Bell, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// 알림 종류별 배지 라벨/색상. 참가업체·고객 알림 타입을 모두 여기서 다룬다.
const NOTIFICATION_META = {
  BOOTH_APPROVED: { label: '승인', tone: 'positive' },
  BOOTH_REJECTED: { label: '반려', tone: 'negative' },
  CONSULTATION_RECEIVED: { label: '상담', tone: 'info' },
  CONSULTATION_APPROVED: { label: '확정', tone: 'positive' },
  EXPO_TICKET_CANCELLED: { label: '예약취소', tone: 'negative' },
  EXPO_SCHEDULE_CHANGED: { label: '일정변경', tone: 'info' },
};

const TONE_BADGE = {
  positive: 'bg-emerald-100 text-emerald-700',
  negative: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
};
const TONE_DOT = {
  positive: 'bg-emerald-500',
  negative: 'bg-red-500',
  info: 'bg-blue-500',
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

  // 마운트 시 SSE 구독. 새 알림 오면 unreadCount 올리고, 드롭다운 열려있으면 목록 맨 위에 얹음
  useEffect(() => {
    const source = api.subscribe((notification) => {
      setUnreadCount((c) => c + 1);
      setNotifications((prev) => (open ? [notification, ...prev] : prev));
    });
    return () => source.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  const handleOpenChange = (next) => {
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
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="알림" className="relative">
          <Bell />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1.5 size-2 rounded-full border-2 border-background bg-red-500" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] gap-0 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">알림</span>
          {unreadCount > 0 && (
            <Button variant="link" size="xs" className="h-auto p-0" onClick={handleMarkAllRead}>
              모두 읽음 ({unreadCount})
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">아직 알림이 없습니다.</p>
        ) : (
          <ul className="m-0 max-h-96 list-none divide-y overflow-y-auto p-0">
            {notifications.map((n) => {
              const meta = NOTIFICATION_META[n.type] ?? { label: '알림', tone: 'info' };
              return (
                <li
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    'group flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-muted',
                    !n.read && 'bg-primary/5'
                  )}
                >
                  <span
                    className={cn(
                      'mt-1.5 size-2 shrink-0 rounded-full bg-transparent',
                      !n.read && TONE_DOT[meta.tone]
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant="secondary" className={cn('h-5 px-2 text-[11px]', TONE_BADGE[meta.tone])}>
                        {meta.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatRelativeTime(n.createdAt)}</span>
                    </div>
                    <p className="m-0 truncate text-sm font-medium">{n.title}</p>
                    <p className="m-0 line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                  </div>
                  {n.read && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="알림 삭제"
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => handleDelete(e, n.id)}
                    >
                      <X />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default NotificationBell;
