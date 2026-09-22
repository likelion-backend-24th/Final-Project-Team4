import { Pencil } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminExpoList, toAssetUrl } from '../../api/expo';
import { EmptyState, PageContainer, PageHero, Pagination } from '@/components/layout/Page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const EXPO_STATUS_LABEL = {
  DRAFT: '비공개',
  OPEN: '모집중',
};

// 한 페이지에서 보여줄 카드 개수 - 초과될 경우 하단에 페이지 넘버링
const PAGE_SIZE = 8;

function Bar({ segments }) {
  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-muted">
      {segments.map(([cls, ratio]) => (
        <span key={cls} className={cls} style={{ width: `${ratio}%` }} />
      ))}
    </div>
  );
}

function AdminExpoList() {
  const navigate = useNavigate();
  const [expos, setExpos] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    getAdminExpoList()
      .then((res) => setExpos(res.content))
      .catch((err) => setLoadError(err.response?.data?.error?.message ?? '박람회 목록을 불러오지 못했습니다.'));
  }, []);

  const sorted = useMemo(() => [...expos].sort((a, b) => b.expoId - a.expoId), [expos]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));

  const paginated = useMemo(() => sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [sorted, page]);

  return (
    <div>
      <PageHero
        eyebrow="EXHIBITOR MANAGEMENT PORTAL"
        title="참가 신청 관리"
        description="박람회를 선택하면 해당 박람회의 실시간 부스 배치 현황과 참가 신청 목록을 확인할 수 있습니다."
      />

      <PageContainer>
        {loadError && <EmptyState tone="error">{loadError}</EmptyState>}
        {sorted.length === 0 && !loadError && <EmptyState>등록된 박람회가 없습니다.</EmptyState>}

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {paginated.map((expo) => {
            const boothFillRatio =
              expo.totalBooths > 0 ? Math.round(((expo.totalBooths - expo.availableBooths) / expo.totalBooths) * 100) : 0;
            const total = expo.totalApplications;
            const ratio = (n) => (total > 0 ? (n / total) * 100 : 0);

            return (
              <Card
                key={expo.expoId}
                role="button"
                tabIndex={0}
                className="cursor-pointer gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md"
                onClick={() => navigate(`/admin/applications/${expo.expoId}`)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/admin/applications/${expo.expoId}`)}
              >
                {expo.bannerImageUrl && (
                  <div className="h-28 bg-cover bg-center" style={{ backgroundImage: `url(${toAssetUrl(expo.bannerImageUrl)})` }} />
                )}
                <CardContent className="flex flex-col gap-4 p-5">
                  <div className="flex items-center gap-2">
                    <Badge variant={expo.status === 'OPEN' ? 'default' : 'secondary'}>
                      {EXPO_STATUS_LABEL[expo.status] ?? expo.status}
                    </Badge>
                    {expo.pendingCount > 0 && (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                        심사 대기 {expo.pendingCount}건
                      </Badge>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="ml-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/expos/${expo.expoId}/edit`);
                      }}
                    >
                      <Pencil /> 수정
                    </Button>
                  </div>

                  <div>
                    <h2 className="m-0 line-clamp-2 text-lg font-semibold">{expo.title}</h2>
                    <p className="m-0 mt-1 text-xs text-muted-foreground">
                      신청 기간 {expo.applyStartsAt.slice(0, 10)} ~ {expo.applyEndsAt.slice(0, 10)}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">신청 처리 현황</span>
                      <span className="font-semibold">{total}건</span>
                    </div>
                    <Bar
                      segments={
                        total > 0
                          ? [
                              ['bg-emerald-500', ratio(expo.approvedCount)],
                              ['bg-amber-400', ratio(expo.pendingCount)],
                              ['bg-red-400', ratio(expo.rejectedCount)],
                            ]
                          : []
                      }
                    />
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-emerald-500" />승인 {expo.approvedCount}</span>
                      <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-amber-400" />대기 {expo.pendingCount}</span>
                      <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-red-400" />반려 {expo.rejectedCount}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">부스 배정 현황</span>
                      <span className="font-semibold">
                        {expo.totalBooths - expo.availableBooths} / {expo.totalBooths}
                      </span>
                    </div>
                    <Bar segments={[['bg-primary', boothFillRatio]]} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </PageContainer>
    </div>
  );
}

export default AdminExpoList;
