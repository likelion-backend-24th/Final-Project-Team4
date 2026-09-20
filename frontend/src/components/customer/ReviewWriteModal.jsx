import { useState } from 'react';
import { addBoothReviewImage, createBoothReview, draftConsultationReview, updateBoothReview } from '../../api/expo';
import './Modal.css';
import './ReviewWriteModal.css';

// 후기 작성 모달 - 예약한 상담(마이페이지)에서 "후기 작성하러 가기"로 진입하거나,
// 부스 상세 화면에서 직접 열림. 작성 자격(상담 완료 후 5일 이내)은 서버가 최종 검증한다.
// consultationId가 있을 때만(=상담에서 진입) AI 초안 생성을 쓸 수 있다 - 본인 상담 요구사항 +
// 참가업체 현장 메모를 근거로 하기 때문에 어느 상담에서 왔는지 알아야 한다.
// editing(내가 쓴 후기 1건)을 넘기면 수정 모드 - 유형은 고정, 내용/차량명만 수정하고 사진은 다루지 않는다.
const TYPE_LABEL = { CONSULT: '상담후기', BOOTH: '부스후기' };
const MAX_IMAGES = 5;

function ReviewWriteModal({ boothId, consultationId, defaultType = 'CONSULT', defaultVehicleName = '', lockType = false, editing, onClose, onCreated }) {
  const [reviewType, setReviewType] = useState(editing?.reviewType ?? defaultType);
  const [vehicleName, setVehicleName] = useState(editing?.vehicleName ?? defaultVehicleName);
  const [content, setContent] = useState(editing?.content ?? '');
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleAddImages = (e) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    setImages((prev) => [...prev, ...files].slice(0, MAX_IMAGES));
  };

  const removeImage = (idx) => setImages((prev) => prev.filter((_, i) => i !== idx));

  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState(null);

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
    const payload = {
      reviewType,
      vehicleName: reviewType === 'CONSULT' ? vehicleName.trim() : null,
      content: content.trim(),
    };
    (editing ? updateBoothReview(boothId, editing.reviewId, payload) : createBoothReview(boothId, payload))
      .then((review) =>
        // 사진 업로드는 부가 기능 - 한 장이 실패해도 이미 등록된 후기 자체는 그대로 둔다(best-effort). 수정 모드는 사진 없음.
        images
          .reduce((chain, file) => chain.then(() => addBoothReviewImage(boothId, review.reviewId, file).catch(() => {})), Promise.resolve())
          .then(() => review)
      )
      .then((review) => {
        onCreated?.(review);
        onClose();
      })
      .catch((err) => setError(err.response?.data?.error?.message ?? `후기 ${editing ? '수정' : '작성'} 중 오류가 발생했습니다.`))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="c-modal__backdrop" onClick={() => !submitting && onClose()}>
      <div className="c-modal c-review-write" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="c-modal__close" onClick={onClose} disabled={submitting} aria-label="닫기">
          ✕
        </button>

        <div className="c-review-write__body">
          <h2>{editing ? '후기 수정' : '후기 작성'}</h2>

          {lockType || editing ? (
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

          {!editing && (
          <div className="c-review-write__field">
            <span>사진 (선택, 최대 {MAX_IMAGES}장)</span>
            <div className="c-review-write__images">
              {images.map((file, i) => (
                <div key={i} className="c-review-write__thumb">
                  <img src={URL.createObjectURL(file)} alt={`첨부 이미지 ${i + 1}`} />
                  <button type="button" onClick={() => removeImage(i)} aria-label="사진 삭제">
                    ✕
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <label className="c-review-write__add-thumb">
                  +
                  <input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={handleAddImages} />
                </label>
              )}
            </div>
          </div>
          )}

          {error && <p className="c-modal__error">{error}</p>}

          <button type="button" className="c-modal__primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? (editing ? '수정 중...' : '등록 중...') : editing ? '수정' : '등록'}
          </button>
          <button type="button" className="c-modal__secondary" onClick={onClose} disabled={submitting}>
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReviewWriteModal;
