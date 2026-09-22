import { ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVisitedBooths } from '../../api/expo';
import { AppDialog } from '@/components/layout/AppDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// 나의 입장권(만료 후 5일 이내)에서 "후기 작성하러 가기"를 누르면 뜨는 모달 - QR 스캔으로 방문 기록을
// 남긴 부스 중 하나를 골라 그 부스의 부스후기 작성 화면으로 이동한다(TASK 7-3).
function VisitedBoothsModal({ expoId, reviewedBoothIds = [], onClose }) {
  const navigate = useNavigate();
  const [booths, setBooths] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getVisitedBooths(expoId)
      .then(setBooths)
      .catch((err) => setError(err.response?.data?.error?.message ?? '방문한 부스 목록을 불러오지 못했습니다.'));
  }, [expoId]);

  const goWriteReview = (boothId) => {
    navigate(`/customer/expos/${expoId}/booths/${boothId}?writeReview=BOOTH`);
  };

  return (
    <AppDialog onClose={onClose} title="방문한 부스 선택" description="후기를 남길 부스를 선택해주세요.">
      {error ? (
        <p className="m-0 text-sm text-destructive">{error}</p>
      ) : !booths ? (
        <p className="m-0 py-4 text-center text-sm text-muted-foreground">불러오는 중...</p>
      ) : booths.length === 0 ? (
        <p className="m-0 py-4 text-center text-sm text-muted-foreground">방문 기록이 있는 부스가 없습니다.</p>
      ) : (
        <ul className="m-0 flex max-h-80 list-none flex-col gap-2 overflow-y-auto p-0">
          {booths.map((b) => {
            const reviewed = reviewedBoothIds.includes(b.boothId);
            return (
              <li key={b.boothId}>
                <Button
                  variant="outline"
                  className="h-auto w-full justify-between px-3.5 py-3"
                  disabled={reviewed}
                  onClick={() => goWriteReview(b.boothId)}
                >
                  <span>
                    {b.companyName || `${b.boothNo} 부스`}
                    {reviewed && ' (작성 완료)'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Badge variant="secondary">{b.boothNo}</Badge>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </span>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </AppDialog>
  );
}

export default VisitedBoothsModal;
