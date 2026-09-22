import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVisitedBooths } from '../../api/expo';
import { isReviewWindowOpen } from '../../mock/customerData';
import { AppDialog } from '@/components/layout/AppDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

  const Item = ({ onClick, title, sub, deadline }) => (
    <li>
      <Button variant="outline" className="h-auto w-full justify-between px-3.5 py-3 text-left" onClick={onClick}>
        <span className="min-w-0">
          <span className="block truncate">{title}</span>
          <small className="block truncate text-xs font-normal text-muted-foreground">{sub}</small>
        </span>
        <Badge variant="secondary" className="shrink-0 text-primary">{dLabel(deadline)}</Badge>
      </Button>
    </li>
  );

  return (
    <AppDialog
      onClose={onClose}
      title="작성할 수 있는 후기"
      description="완료·방문 후 5일 이내인 후기만 작성할 수 있습니다. 마감이 임박한 순서로 보여줍니다."
    >
      {error && <p className="m-0 text-sm text-destructive">{error}</p>}
      {!error && !booths && <p className="m-0 py-4 text-center text-sm text-muted-foreground">불러오는 중...</p>}
      {empty && <p className="m-0 py-4 text-center text-sm text-muted-foreground">지금 작성할 수 있는 후기가 없습니다.</p>}

      {writableConsultations.length > 0 && (
        <section>
          <h3 className="m-0 mb-2 text-sm font-semibold">상담후기</h3>
          <ul className="m-0 flex max-h-60 list-none flex-col gap-2 overflow-y-auto p-0">
            {writableConsultations.map((c) => (
              <Item
                key={c.consultationId}
                onClick={() => writeConsultReview(c)}
                title={`${c.companyName || `${c.boothNo} 부스`}${c.interestedVehicle ? ` · ${c.interestedVehicle}` : ''}`}
                sub={`${c.expoTitle} · 상담일 ${c.preferredDate}`}
                deadline={c.reviewDeadline}
              />
            ))}
          </ul>
        </section>
      )}

      {booths?.length > 0 && (
        <section>
          <h3 className="m-0 mb-2 text-sm font-semibold">부스후기</h3>
          <ul className="m-0 flex max-h-60 list-none flex-col gap-2 overflow-y-auto p-0">
            {booths.map((b) => (
              <Item
                key={b.boothId}
                onClick={() => writeBoothReview(b)}
                title={b.companyName || `${b.boothNo} 부스`}
                sub={`${b.expoTitle} · ${b.boothNo}`}
                deadline={b.reviewDeadline}
              />
            ))}
          </ul>
        </section>
      )}
    </AppDialog>
  );
}

export default WritableReviewsModal;
