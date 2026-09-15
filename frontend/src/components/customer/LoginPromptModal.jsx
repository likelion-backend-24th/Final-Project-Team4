import './Modal.css';

// 비로그인 상태에서 로그인이 필요한 기능(상담 신청 등)을 시도했을 때 보여주는 안내 모달.
// EntryFlowModal의 LoginRequired 스텝과 같은 디자인을 로그인 화면 전체 강제 이동 없이 재사용한다.
function LoginPromptModal({ desc, onLogin, onClose }) {
  return (
    <div className="c-modal__backdrop" onClick={onClose}>
      <div className="c-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="c-modal__close" onClick={onClose} aria-label="닫기">
          ✕
        </button>
        <div className="c-modal__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        <h2>로그인이 필요합니다</h2>
        <p className="c-modal__desc">{desc}</p>
        <button type="button" className="c-modal__primary" onClick={onLogin}>
          로그인하러 가기
        </button>
        <button type="button" className="c-modal__secondary" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}

export default LoginPromptModal;
