import { Link, NavLink } from 'react-router-dom';
import logoIcon from '../assets/logo-icon.png';
import './Header.css';

function Header() {
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
        {/* 참가 신청 관리 페이지는 아직 없어서 임시로 마이페이지로 보내되, 활성 표시는 안 함 */}
        <Link to="/mypage">참가 신청 관리</Link>
        <NavLink to="/mypage" className={({ isActive }) => (isActive ? 'is-active' : '')}>
          마이페이지
        </NavLink>
      </nav>
      <div className="app-header__account">
        <Link to="/mypage" className="app-header__user">
          <span className="app-header__avatar" />
          <span>현대모비스(주)</span>
        </Link>
        <Link to="/login" className="app-header__logout">
          로그아웃
        </Link>
      </div>
    </header>
  );
}

export default Header;
