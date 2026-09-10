import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import logoIcon from '../../assets/logo-icon.png';
import apiClient from '../../api/client';
import { clearAuth, useIsLoggedIn } from '../../api/auth';
import { getMyProfile } from '../../api/identity';
import '../Header.css';

// 일반 사용자(방문객)용 상단 헤더. 참가업체용 Header와 레이아웃은 동일하되
// 계정 표시가 "OOO(사용자)"로 나오고, 네비게이션 목적지가 고객 화면(/customer/*)을 가리킴.
function CustomerHeader() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const loggedIn = useIsLoggedIn();

  useEffect(() => {
    if (!loggedIn) return; // 게스트는 /api/auth/me 호출 안 함 (401 -> /login 리다이렉트 방지)
    getMyProfile()
      .then((p) => setName(p.name ?? ''))
      .catch(() => setName(''));
  }, [loggedIn]);

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
      <Link to="/customer" className="app-header__brand">
        <img src={logoIcon} alt="" className="app-header__logo" />
        <span>MOBILITY EXPO</span>
      </Link>
      <nav className="app-header__nav">
        <NavLink to="/customer" end className={({ isActive }) => (isActive ? 'is-active' : '')}>
          박람회 목록
        </NavLink>
        {loggedIn && (
          <NavLink to="/customer/mypage" className={({ isActive }) => (isActive ? 'is-active' : '')}>
            마이페이지
          </NavLink>
        )}
      </nav>
      <div className="app-header__account">
        <Link to={loggedIn ? '/customer/mypage' : '/login'} className="app-header__user">
          <span className="app-header__avatar" />
          <span>{loggedIn ? (name ? `${name}(사용자)` : '내 정보') : '비회원'}</span>
        </Link>
        {loggedIn ? (
          <Link to="/login" className="app-header__logout" onClick={handleLogout}>
            로그아웃
          </Link>
        ) : (
          <Link to="/login" className="app-header__logout">
            로그인
          </Link>
        )}
      </div>
    </header>
  );
}

export default CustomerHeader;
