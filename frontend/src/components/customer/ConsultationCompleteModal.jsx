import './Modal.css';

// 상담 신청 완료 팝업 (VehicleDetail 페이지의 상담 신청 폼 제출 후 표시)
function ConsultationCompleteModal({ summary, onClose }) {
  return (
    <div className="c-modal__backdrop" onClick={onClose}>
      <div className="c-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="c-modal__close" onClick={onClose} aria-label="닫기">
          ✕
        </button>
        <div className="c-modal__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2>상담 신청이 완료되었습니다!</h2>
        <p className="c-modal__desc">
          선택하신 일정에 맞춰
          <br />
          담당자가 개별적으로 연락드릴 예정입니다.
        </p>
        <dl className="c-modal__info">
          <div className="c-modal__info-row">
            <dt>신청 차량</dt>
            <dd>{summary.vehicleName}</dd>
          </div>
          <div className="c-modal__info-row">
            <dt>상담 일시</dt>
            <dd>{summary.schedule}</dd>
          </div>
          <div className="c-modal__info-row">
            <dt>연락처</dt>
            <dd>{summary.phone}</dd>
          </div>
          <div className="c-modal__info-row">
            <dt>이메일</dt>
            <dd>{summary.email}</dd>
          </div>
        </dl>
        <button type="button" className="c-modal__primary" onClick={onClose}>
          확인
        </button>
      </div>
    </div>
  );
}

export default ConsultationCompleteModal;
