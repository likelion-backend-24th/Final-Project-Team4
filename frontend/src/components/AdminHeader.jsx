import { Link, NavLink, useNavigate } from 'react-router-dom';
import logoIcon from '../assets/logo-icon.png';
import apiClient from '../api/client';
import { clearAuth } from '../api/auth';
import AccountMenu from './AccountMenu';
import './Header.css';

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
    <header className="app-header">
      <Link to="/admin" className="app-header__brand">
        <img src={logoIcon} alt="" className="app-header__logo" />
        <span>MOBILITY EXPO</span>
      </Link>
      <nav className="app-header__nav">
        {/* <NavLink to="/admin" end className={({ isActive }) => (isActive ? 'is-active' : '')}>
          대시보드
        </NavLink> */}
        <NavLink to="/admin/applications" className={({ isActive }) => (isActive ? 'is-active' : '')}>
          참가신청 관리
        </NavLink>
        <NavLink to="/admin/expos/new" className={({ isActive }) => (isActive ? 'is-active' : '')}>
          박람회 등록
        </NavLink>
        <NavLink to="/admin/stats" className={({ isActive }) => (isActive ? 'is-active' : '')}>
          통계
        </NavLink>
      </nav>
      <div className="app-header__account">
        {/* 관리자는 마이페이지가 없어 mypageTo 없이 로그아웃만 노출 */}
        <AccountMenu label="최고 관리자" onLogout={handleLogout} />
      </div>
    </header>
  );
}

export default AdminHeader;
