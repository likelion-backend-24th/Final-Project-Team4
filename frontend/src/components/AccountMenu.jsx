import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

// 헤더 우측 계정 드롭다운
// label: 트리거/요약에 보여줄 이름, mypageTo: 마이페이지 경로, onLogout: 로그아웃 핸들러
function AccountMenu({ label, mypageTo, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // 메뉴 바깥을 클릭하면 닫기
  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  return (
    <div className="app-header__account-menu" ref={ref}>
      <button
        type="button"
        className="app-header__account-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span>{label}</span>
      </button>
      {open && (
        <div className="app-header__account-panel">
          <p className="app-header__account-summary">{label}</p>
          <Link to={mypageTo} className="app-header__account-item" onClick={() => setOpen(false)}>
            마이페이지
          </Link>
          <div className="app-header__account-divider" />
          <button
            type="button"
            className="app-header__account-item app-header__account-item--logout"
            onClick={(e) => {
              setOpen(false);
              onLogout(e);
            }}
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}

export default AccountMenu;
