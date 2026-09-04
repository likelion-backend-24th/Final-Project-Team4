import { Link, NavLink, useNavigate } from 'react-router-dom';
import logoIcon from '../assets/logo-icon.png';
import apiClient from '../api/client';
import { clearAuth } from '../api/auth';
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
        <NavLink to="/admin" end className={({ isActive }) => (isActive ? 'is-active' : '')}>
          대시보드
        </NavLink>
        <NavLink to="/admin/applications" className={({ isActive }) => (isActive ? 'is-active' : '')}>
          참가신청 관리
        </NavLink>
        <NavLink to="/admin/expos/new" className={({ isActive }) => (isActive ? 'is-active' : '')}>
          박람회 등록
        </NavLink>
      </nav>
      <div className="app-header__account">
        <div className="app-header__user">
          <span className="app-header__avatar" />
          <span>최고 관리자</span>
        </div>
        <Link to="/login" className="app-header__logout" onClick={handleLogout}>
          로그아웃
        </Link>
      </div>
    </header>
  );
}

export default AdminHeader;
