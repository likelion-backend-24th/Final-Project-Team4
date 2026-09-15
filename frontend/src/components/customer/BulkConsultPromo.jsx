import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BulkConsultationModal from './BulkConsultationModal';
import LoginPromptModal from './LoginPromptModal';
import { isLoggedIn } from '../../api/auth';
import '../../pages/customer/ExhibitorList.css';

// 참가업체 목록 / 차량 상세 페이지에서 공통으로 쓰는 "여러 업체 한 번에 상담 신청" 사이드 프로모 박스.
// 넓은 화면에서는 사이드바에 그대로 붙어있고, 화면이 좁아지면 맨 아래로 밀려나는 대신
// 우측에 작은 플로팅 버튼으로 접혀서 항상 떠 있다가, 누르면 다시 펼쳐진다.
// 상담 신청은 로그인한 회원만 가능 - 비로그인 상태면 로그인 유도 모달을 먼저 띄운다.
function BulkConsultPromo({ expoId, groups }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [showBulkConsult, setShowBulkConsult] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const openBulkConsult = () => {
    if (isLoggedIn()) {
      setShowBulkConsult(true);
    } else {
      setShowLoginPrompt(true);
    }
  };

  return (
    <>
      <aside className={`c-bulk-promo${expanded ? ' is-expanded' : ''}`}>
        <button
          type="button"
          className="c-bulk-promo__collapse"
          onClick={() => setExpanded(false)}
          aria-label="닫기"
        >
          ×
        </button>
        <span className="c-bulk-promo__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 4h16v11H8l-4 4V4z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h2>
          관심 있는 <span className="c-bulk-promo__accent">모든 업체에</span>
          <br />
          <span className="c-bulk-promo__accent">한 번에 상담 신청</span>
        </h2>
        <button type="button" className="c-bulk-promo__cta" onClick={openBulkConsult}>
          원클릭 상담 신청 →
        </button>
        <ul className="c-bulk-promo__checklist">
          <li>여러 업체에 한 번에 신청</li>
          <li>간편한 정보 입력</li>
          <li>빠른 답변을 받아보세요</li>
        </ul>
        <p className="c-bulk-promo__tagline">CONNECT FOR A BETTER MOBILITY</p>
      </aside>

      {/* 좁은 화면에서만 보이는 우측 고정 플로팅 버튼 - is-expanded가 아닐 때 항상 떠 있다. */}
      <button type="button" className="c-bulk-promo__fab" onClick={() => setExpanded(true)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 4h16v11H8l-4 4V4z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        상담 신청
      </button>

      {showBulkConsult && (
        <BulkConsultationModal expoId={expoId} groups={groups} onClose={() => setShowBulkConsult(false)} />
      )}

      {showLoginPrompt && (
        <LoginPromptModal
          desc="상담 신청은 로그인한 회원만 이용할 수 있습니다."
          onLogin={() => navigate('/login')}
          onClose={() => setShowLoginPrompt(false)}
        />
      )}
    </>
  );
}

export default BulkConsultPromo;
