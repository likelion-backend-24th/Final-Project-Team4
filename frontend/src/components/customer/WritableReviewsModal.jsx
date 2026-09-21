import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVisitedBooths } from '../../api/expo';
import { isReviewWindowOpen } from '../../mock/customerData';
import './Modal.css';
import './VisitedBoothsModal.css';

// 마감까지 남은 일수 표시 - 당일이면 "오늘 마감". deadlineIso는 'YYYY-MM-DD' 또는 'YYYY-MM-DDTHH:mm:ss'.
const dLabel = (deadlineIso) => {
  const deadline = new Date(`${deadlineIso.slice(0, 10)}T00:00:00`);
  const days = Math.round((deadline - new Date(new Date().toDateString())) / 86400000);
  return days <= 0 ? '오늘 마감' : `D-${days}`;
};
const byDeadline = (a, b) => a.reviewDeadline.localeCompare(b.reviewDeadline);

// 내가 쓴 후기 옆 "후기 쓰러 가기" - 지금 쓸 수 있는 후기를 마감 임박순으로 한곳에 모아 보여준다.
// 상담후기: 상담 응답의 reviewable(완료 후 5일 이내) 중 아직 안 쓴 것.
// 부스후기: 방문일 후 5일 이내인 입장권의 박람회에서 방문 기록의 reviewDeadline이 있는 부스 중 아직 안 쓴 것(부스당 1개).
function WritableReviewsModal({ consultations, tickets, myReviews, onClose }) {
  const navigate = useNavigate();
  const [booths, setBooths] = useState(null); // [{ expoId, expoTitle, boothId, boothNo, companyName, reviewDeadline }]
  const [error, setError] = useState(null);

  const reviewedConsultIds = useMemo(
    () => new Set(myReviews.filter((r) => r.reviewType === 'CONSULT').map((r) => r.consultationId)),
    [myReviews]
  );
  const reviewedBoothIds = useMemo(
    () => new Set(myReviews.filter((r) => r.reviewType === 'BOOTH').map((r) => r.boothId)),
    [myReviews]
  );

  const writableConsultations = consultations
    .filter((c) => c.reviewable && c.reviewDeadline && !reviewedConsultIds.has(c.consultationId))
    .sort(byDeadline);

  const expoTitleById = useMemo(() => {
    const map = new Map();
    tickets.filter(isReviewWindowOpen).forEach((t) => map.set(t.expoId, t.expoTitle));
    return map;
  }, [tickets]);

  useEffect(() => {
    Promise.all(
      [...expoTitleById.keys()].map((expoId) =>
        getVisitedBooths(expoId).then((list) =>
          list.map((b) => ({ ...b, expoId, expoTitle: expoTitleById.get(expoId) }))
        )
      )
    )
      .then((lists) =>
        setBooths(lists.flat().filter((b) => b.reviewDeadline && !reviewedBoothIds.has(b.boothId)).sort(byDeadline))
      )
      .catch((err) => setError(err.response?.data?.error?.message ?? '방문한 부스 목록을 불러오지 못했습니다.'));
  }, [expoTitleById, reviewedBoothIds]);

  const writeConsultReview = (c) => {
    const params = new URLSearchParams({ writeReview: 'CONSULT', consultationId: c.consultationId });
    if (c.interestedVehicle) params.set('vehicleName', c.interestedVehicle);
    navigate(`/customer/expos/${c.expoId}/booths/${c.boothId}?${params.toString()}`);
  };

  const writeBoothReview = (b) => navigate(`/customer/expos/${b.expoId}/booths/${b.boothId}?writeReview=BOOTH`);

  const empty = writableConsultations.length === 0 && booths?.length === 0;

  return (
    <div className="c-modal__backdrop" onClick={onClose}>
      <div className="c-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="c-modal__close" onClick={onClose} aria-label="닫기">
          ✕
        </button>
        <h2>작성할 수 있는 후기</h2>
        <p className="c-modal__desc">완료·방문 후 5일 이내인 후기만 작성할 수 있습니다. 마감이 임박한 순서로 보여줍니다.</p>

        {error && <p className="c-modal__error">{error}</p>}
        {!error && !booths && <p className="c-visited-booths__status">불러오는 중...</p>}
        {empty && <p className="c-visited-booths__status">지금 작성할 수 있는 후기가 없습니다.</p>}

        {writableConsultations.length > 0 && (
          <>
            <h3 className="c-writable-reviews__section">상담후기</h3>
            <ul className="c-visited-booths__list">
              {writableConsultations.map((c) => (
                <li key={c.consultationId}>
                  <button type="button" onClick={() => writeConsultReview(c)}>
                    <span>
                      {c.companyName || `${c.boothNo} 부스`}
                      {c.interestedVehicle && ` · ${c.interestedVehicle}`}
                      <small className="c-writable-reviews__sub">{c.expoTitle} · 상담일 {c.preferredDate}</small>
                    </span>
                    <span className="c-writable-reviews__dday">{dLabel(c.reviewDeadline)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {booths?.length > 0 && (
          <>
            <h3 className="c-writable-reviews__section">부스후기</h3>
            <ul className="c-visited-booths__list">
              {booths.map((b) => (
                <li key={b.boothId}>
                  <button type="button" onClick={() => writeBoothReview(b)}>
                    <span>
                      {b.companyName || `${b.boothNo} 부스`}
                      <small className="c-writable-reviews__sub">{b.expoTitle} · {b.boothNo}</small>
                    </span>
                    <span className="c-writable-reviews__dday">{dLabel(b.reviewDeadline)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

export default WritableReviewsModal;
