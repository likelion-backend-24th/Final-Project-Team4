import './Modal.css';

// 박람회 상세를 보는 중에 관리자가 비공개로 전환했거나 삭제해서 더 이상 조회할 수 없게 됐을 때 보여주는 안내 모달.
// 뒤에 보여줄 데이터가 없으므로 닫기 없이 목록으로 돌아가는 버튼만 둔다.
function ExpoUnavailableModal({ onConfirm }) {
  return (
    <div className="c-modal__backdrop">
      <div className="c-modal">
        <div className="c-modal__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v5" strokeLinecap="round" />
            <path d="M12 16h.01" strokeLinecap="round" />
          </svg>
        </div>
        <h2>이용할 수 없는 박람회입니다</h2>
        <p className="c-modal__desc">삭제되었거나 비공개로 전환된 박람회예요.</p>
        <button type="button" className="c-modal__primary" onClick={onConfirm}>
          목록으로 돌아가기
        </button>
      </div>
    </div>
  );
}

export default ExpoUnavailableModal;
