import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import logoIcon from '../assets/logo-icon.png';
import apiClient from '../api/client';
import { clearAuth, useIsLoggedIn, useProfileVersion } from '../api/auth';
import { getMyProfile } from '../api/identity';
import { deleteNotification, getNotifications, getUnreadNotificationCount, markNotificationRead } from '../api/notifications';
import './Header.css';

// 알림 종류별로 클릭 시 이동할 화면 + 배지 라벨/색상
const NOTIFICATION_TARGET = {
  BOOTH_APPROVED: '/mypage',
  BOOTH_REJECTED: '/mypage',
  CONSULTATION_RECEIVED: '/consultations',
};

const NOTIFICATION_META = {
  BOOTH_APPROVED: { label: '승인', tone: 'positive' },
  BOOTH_REJECTED: { label: '반려', tone: 'negative' },
  CONSULTATION_RECEIVED: { label: '상담', tone: 'info' },
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

function Header() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState('');
  const loggedIn = useIsLoggedIn();
  const profileVersion = useProfileVersion();

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef(null);

  useEffect(() => {
    if (!loggedIn) return; // 게스트는 /api/auth/me 호출 안 함 (401 -> /login 리다이렉트 방지)
    getMyProfile()
      .then((p) => setCompanyName(p.companyName ?? ''))
      .catch(() => setCompanyName(''));
  }, [loggedIn, profileVersion]);

  // 안 읽은 알림 개수는 로그인 시 바로 조회하고, 이후 30초마다 새로고침(실시간 push는 이번 범위 밖)
  useEffect(() => {
    if (!loggedIn) return;
    const refreshUnreadCount = () => getUnreadNotificationCount().then(setUnreadCount).catch(() => {});
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [loggedIn]);

  // 알림함 바깥을 클릭하면 닫기
  useEffect(() => {
    if (!notificationsOpen) return;
    const handleOutsideClick = (e) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [notificationsOpen]);

  const toggleNotifications = () => {
    const next = !notificationsOpen;
    setNotificationsOpen(next);
    if (next) {
      getNotifications({ page: 0, size: 20 })
        .then((res) => setNotifications(res.content ?? []))
        .catch(() => setNotifications([]));
    }
  };

  const handleNotificationClick = (notification) => {
    setNotificationsOpen(false);
    if (!notification.read) {
      markNotificationRead(notification.id)
        .then(() => setUnreadCount((c) => Math.max(0, c - 1)))
        .catch(() => {});
    }
    navigate(NOTIFICATION_TARGET[notification.type] ?? '/mypage');
  };

  // 읽은 알림 삭제. 목록 클릭(읽음 처리+이동)과 이벤트가 겹치지 않게 버블링을 막는다.
  const handleNotificationDelete = (e, notificationId) => {
    e.stopPropagation();
    deleteNotification(notificationId)
      .then(() => setNotifications((prev) => prev.filter((n) => n.id !== notificationId)))
      .catch(() => {});
  };

  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/api/auth/logout'); // refreshToken 쿠키 만료 + Redis 삭제
    } catch {
      // 실패해도 로컬 토큰은 비움
    }
    clearAuth();
    navigate('/login');
  };

  return (
    <header className="app-header">
      <Link to="/" className="app-header__brand">
        <img src={logoIcon} alt="" className="app-header__logo" />
        <span>MOBILITY EXPO</span>
      </Link>
      <nav className="app-header__nav">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'is-active' : '')}>
          박람회 목록
        </NavLink>
        <NavLink to="/consultations" className={({ isActive }) => (isActive ? 'is-active' : '')}>
          상담 신청 관리
        </NavLink>
        <NavLink to="/leads" className={({ isActive }) => (isActive ? 'is-active' : '')}>
          QR 리드 확보
        </NavLink>
        <NavLink to="/mypage" className={({ isActive }) => (isActive ? 'is-active' : '')}>
          마이페이지
        </NavLink>
      </nav>
      <div className="app-header__account">
        <div className="app-header__notifications" ref={notificationsRef}>
          <button
            type="button"
            className={`app-header__notifications-trigger${unreadCount > 0 ? ' has-unread' : ''}`}
            onClick={toggleNotifications}
          >
            알림
          </button>
          {notificationsOpen && (
            <div className="app-header__notifications-panel">
              <div className="app-header__notifications-panel-head">
                <span>알림</span>
                {unreadCount > 0 && <span className="app-header__notifications-count">{unreadCount}개 안 읽음</span>}
              </div>
              {notifications.length === 0 ? (
                <p className="app-header__notifications-empty">아직 알림이 없습니다.</p>
              ) : (
                <ul>
                  {notifications.map((n) => {
                    const meta = NOTIFICATION_META[n.type] ?? { label: '알림', tone: 'info' };
                    return (
                      <li
                        key={n.id}
                        className={n.read ? '' : 'is-unread'}
                        onClick={() => handleNotificationClick(n)}
                      >
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
                            onClick={(e) => handleNotificationDelete(e, n.id)}
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
        <Link to="/mypage" className="app-header__user">
          <span className="app-header__avatar" />
          <span>{companyName || '내 정보'}</span>
        </Link>
        <Link to="/login" className="app-header__logout" onClick={handleLogout}>
          로그아웃
        </Link>
      </div>
    </header>
  );
}


export default Header;
