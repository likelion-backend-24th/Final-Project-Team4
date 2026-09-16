import { useState } from 'react';
import { createBoothReview, draftConsultationReview, getConsultationReviewContext } from '../../api/expo';
import './Modal.css';
import './ReviewWriteModal.css';

// 후기 작성 모달 - 예약한 상담(마이페이지)에서 "후기 작성하러 가기"로 진입하거나,
// 부스 상세 화면에서 직접 열림. 작성 자격(상담 완료 후 5일 이내)은 서버가 최종 검증한다.
// consultationId가 있을 때만(=상담에서 진입) "상담내용" 패널·AI 초안 생성을 쓸 수 있다 - 둘 다
// 본인 상담 요구사항 + 참가업체 현장 메모를 근거로 하기 때문에 어느 상담에서 왔는지 알아야 한다.
const TYPE_LABEL = { CONSULT: '상담후기', BOOTH: '부스후기' };

function ReviewWriteModal({ boothId, consultationId, defaultType = 'CONSULT', defaultVehicleName = '', lockType = false, onClose, onCreated }) {
  const [reviewType, setReviewType] = useState(defaultType);
  const [vehicleName, setVehicleName] = useState(defaultVehicleName);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [showContext, setShowContext] = useState(false);
  const [context, setContext] = useState(null);
  const [contextError, setContextError] = useState(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState(null);

  const toggleContext = () => {
    if (showContext) {
      setShowContext(false);
      return;
    }
    setShowContext(true);
    if (context || contextLoading) return;
    setContextLoading(true);
    setContextError(null);
    getConsultationReviewContext(consultationId)
      .then(setContext)
      .catch((err) => setContextError(err.response?.data?.error?.message ?? '상담 내용을 불러오지 못했습니다.'))
      .finally(() => setContextLoading(false));
  };

  const handleAiDraft = () => {
    setDrafting(true);
    setDraftError(null);
    draftConsultationReview(consultationId, { reviewType, vehicleName: vehicleName.trim() || null })
      .then((res) => {
        if (!res.draft) {
          setDraftError('AI 초안 생성에 실패했습니다. 직접 작성해주세요.');
          return;
        }
        setContent(res.draft);
      })
      .catch((err) => setDraftError(err.response?.data?.error?.message ?? 'AI 초안 생성 중 오류가 발생했습니다.'))
      .finally(() => setDrafting(false));
  };

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
      <div
        className={`c-modal c-review-write ${showContext ? 'has-panel' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="c-modal__close" onClick={onClose} disabled={submitting} aria-label="닫기">
          ✕
        </button>

        <div className="c-review-write__body">
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

          {consultationId && (
            <div className="c-review-write__tools">
              <button type="button" className="c-review-write__tool-btn" onClick={toggleContext}>
                {showContext ? '상담내용 닫기' : '상담내용 보기'}
              </button>
              <button type="button" className="c-review-write__tool-btn c-review-write__tool-btn--ai" onClick={handleAiDraft} disabled={drafting}>
                {drafting ? 'AI 작성 중...' : 'AI로 후기 작성하기'}
              </button>
            </div>
          )}
          {draftError && <p className="c-modal__error">{draftError}</p>}

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

        {showContext && (
          <div className="c-review-write__panel">
            <h3>상담내용</h3>
            {contextLoading ? (
              <p className="c-review-write__panel-empty">불러오는 중...</p>
            ) : contextError ? (
              <p className="c-review-write__panel-empty">{contextError}</p>
            ) : context ? (
              <>
                <div className="c-review-write__panel-block">
                  <span className="c-review-write__panel-label">내가 신청한 요구사항</span>
                  <p>{context.customerMessage || '작성한 요청사항이 없습니다.'}</p>
                </div>
                <div className="c-review-write__panel-block">
                  <span className="c-review-write__panel-label">참가업체 상담 메모</span>
                  <p>{context.exhibitorNote || '참가업체가 남긴 메모가 아직 없습니다.'}</p>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export default ReviewWriteModal;
