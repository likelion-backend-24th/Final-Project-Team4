import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { clearAuth, useIsLoggedIn, useProfileVersion } from '../../api/auth';
import { getMyProfile } from '../../api/identity';
import { customerNotificationApi } from '../../api/notifications';
import { Button } from '@/components/ui/button';
import NotificationBell from '../NotificationBell';
import AccountMenu from '../AccountMenu';
import { AppHeader } from '../layout/AppHeader';

// 알림 종류별로 클릭 시 이동할 화면 (고객용) - 전부 마이페이지 "예약한 상담" 탭으로 모인다.
const NOTIFICATION_TARGET = {
  CONSULTATION_APPROVED: '/customer/mypage',
  EXPO_TICKET_CANCELLED: '/customer/mypage',
  EXPO_SCHEDULE_CHANGED: '/customer/mypage',
};

// 일반 사용자(방문객)용 상단 헤더. 참가업체용 Header와 레이아웃은 동일하되
// 계정 표시가 "OOO(참관객)"로 나오고, 네비게이션 목적지가 고객 화면(/customer/*)을 가리킴.
function CustomerHeader() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const loggedIn = useIsLoggedIn();
  const profileVersion = useProfileVersion();

  useEffect(() => {
    if (!loggedIn) return; // 게스트는 /api/auth/me 호출 안 함 (401 -> /login 리다이렉트 방지)
    getMyProfile()
      .then((p) => setName(p.name ?? ''))
      .catch(() => setName(''));
  }, [loggedIn, profileVersion]);

  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/api/auth/logout');
    } catch {
      // 실패해도 로컬 토큰은 비움
    }
    clearAuth();
    navigate('/login');
  };

  return (
    <AppHeader brandTo="/customer">
      {loggedIn ? (
        <>
          <NotificationBell api={customerNotificationApi} targetMap={NOTIFICATION_TARGET} />
          <AccountMenu
            label={name ? `${name} (참관객)` : '내 정보'}
            mypageTo="/customer/mypage"
            onLogout={handleLogout}
          />
        </>
      ) : (
        <>
          <span className="text-sm text-muted-foreground">비회원</span>
          <Button asChild size="sm">
            <Link to="/login">로그인</Link>
          </Button>
        </>
      )}
    </AppHeader>
  );
}

export default CustomerHeader;
