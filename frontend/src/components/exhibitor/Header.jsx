import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/api/client';
import { clearAuth, useIsLoggedIn, useProfileVersion } from '@/api/auth.js';
import { getMyProfile } from '@/api/identity.js';
import { exhibitorNotificationApi } from '@/api/notifications.js';
import NotificationBell from '@/components/NotificationBell';
import AccountMenu from '@/components/AccountMenu';
import { AppHeader } from '@/components/layout/AppHeader';

// 알림 종류별로 클릭 시 이동할 화면 (참가업체용)
const NOTIFICATION_TARGET = {
  BOOTH_APPROVED: '/mypage',
  BOOTH_REJECTED: '/mypage',
  CONSULTATION_RECEIVED: '/consultations',
};

const NAV_ITEMS = [
  { to: '/consultations', label: '상담 신청 관리' },
  { to: '/leads', label: 'QR 리드 확보' },
];

function Header() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState('');
  const loggedIn = useIsLoggedIn();
  const profileVersion = useProfileVersion();

  useEffect(() => {
    if (!loggedIn) return; // 게스트는 /api/auth/me 호출 안 함 (401 -> /login 리다이렉트 방지)
    getMyProfile()
      .then((p) => setCompanyName(p.companyName ?? ''))
      .catch(() => setCompanyName(''));
  }, [loggedIn, profileVersion]);

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
    <AppHeader brandTo="/" navItems={NAV_ITEMS}>
      <NotificationBell api={exhibitorNotificationApi} targetMap={NOTIFICATION_TARGET} />
      <AccountMenu label={companyName} mypageTo="/mypage" onLogout={handleLogout} />
    </AppHeader>
  );
}

export default Header;
