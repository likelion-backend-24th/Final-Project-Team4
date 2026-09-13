import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import logoIcon from '../assets/logo-icon.png';
import apiClient from '../api/client';
import { clearAuth, useIsLoggedIn, useProfileVersion } from '../api/auth';
import { getMyProfile } from '../api/identity';
import './Header.css';

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
        <NavLink to="/mypage" className={({ isActive }) => (isActive ? 'is-active' : '')}>
          마이페이지
        </NavLink>
      </nav>
      <div className="app-header__account">
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
