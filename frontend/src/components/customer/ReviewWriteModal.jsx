import { useState } from 'react';
import { createBoothReview } from '../../api/expo';
import './Modal.css';
import './ReviewWriteModal.css';

// 후기 작성 모달 - 예약한 상담(마이페이지)에서 "후기 작성하러 가기"로 진입하거나,
// 부스 상세 화면에서 직접 열림. 작성 자격(상담 완료 후 5일 이내)은 서버가 최종 검증한다.
const TYPE_LABEL = { CONSULT: '상담후기', BOOTH: '부스후기' };

function ReviewWriteModal({ boothId, defaultType = 'CONSULT', defaultVehicleName = '', lockType = false, onClose, onCreated }) {
  const [reviewType, setReviewType] = useState(defaultType);
  const [vehicleName, setVehicleName] = useState(defaultVehicleName);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = () => {
    if (reviewType === 'CONSULT' && !vehicleName.trim()) {
      setError('차량명을 입력해주세요.');
      return;
    }
    if (!content.trim()) {
      setError('후기 내용을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    setError(null);
    createBoothReview(boothId, {
      reviewType,
      vehicleName: reviewType === 'CONSULT' ? vehicleName.trim() : null,
      content: content.trim(),
    })
      .then((review) => {
        onCreated?.(review);
        onClose();
      })
      .catch((err) => setError(err.response?.data?.error?.message ?? '후기 작성 중 오류가 발생했습니다.'))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="c-modal__backdrop" onClick={() => !submitting && onClose()}>
      <div className="c-modal c-review-write" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="c-modal__close" onClick={onClose} disabled={submitting} aria-label="닫기">
          ✕
        </button>
        <h2>후기 작성</h2>

        {lockType ? (
          <p className="c-review-write__locked-type">{TYPE_LABEL[reviewType]}</p>
        ) : (
          <div className="c-review-write__type">
            <button type="button" className={reviewType === 'CONSULT' ? 'is-selected' : ''} onClick={() => setReviewType('CONSULT')}>
              상담후기
            </button>
            <button type="button" className={reviewType === 'BOOTH' ? 'is-selected' : ''} onClick={() => setReviewType('BOOTH')}>
              부스후기
            </button>
          </div>
        )}

        {reviewType === 'CONSULT' && (
          <label className="c-review-write__field">
            <span>차량명</span>
            <input value={vehicleName} onChange={(e) => setVehicleName(e.target.value)} placeholder="예: EV6" />
          </label>
        )}

        <label className="c-review-write__field">
          <span>후기 내용</span>
          <textarea
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="상담 또는 방문 경험을 자유롭게 남겨주세요."
          />
        </label>

        {error && <p className="c-modal__error">{error}</p>}

        <button type="button" className="c-modal__primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? '등록 중...' : '등록'}
        </button>
        <button type="button" className="c-modal__secondary" onClick={onClose} disabled={submitting}>
          취소
        </button>
      </div>
    </div>
  );
}

export default ReviewWriteModal;
