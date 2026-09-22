import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { clearAuth } from '../api/auth';
import AccountMenu from './AccountMenu';
import { AppHeader } from './layout/AppHeader';

const NAV_ITEMS = [
  // { to: '/admin', label: '대시보드', end: true }, // 대시보드 탭 임시 비활성화
  { to: '/admin/applications', label: '참가신청 관리' },
  { to: '/admin/expos/new', label: '박람회 등록' },
  { to: '/admin/stats', label: '통계' },
];

function AdminHeader() {
  const navigate = useNavigate();

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
    <AppHeader brandTo="/admin" navItems={NAV_ITEMS}>
      {/* 관리자는 마이페이지가 없어 mypageTo 없이 로그아웃만 노출 */}
      <AccountMenu label="최고 관리자" onLogout={handleLogout} />
    </AppHeader>
  );
}

export default AdminHeader;
