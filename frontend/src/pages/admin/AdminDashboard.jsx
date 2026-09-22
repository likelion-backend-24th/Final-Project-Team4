import { useEffect, useState } from 'react';
import { getAdminExpoList } from '../../api/expo';
import { EmptyState, PageContainer, PageHero } from '@/components/layout/Page';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    // size를 넉넉히 줘서 박람회가 많아져도 대시보드 합계가 누락되지 않게 함
    getAdminExpoList({ size: 1000 })
      .then((res) => {
        const expos = res.content ?? [];
        setStats(
          expos.reduce(
            (acc, e) => ({
              total: acc.total + e.totalApplications,
              pending: acc.pending + e.pendingCount,
              approved: acc.approved + e.approvedCount,
              rejected: acc.rejected + e.rejectedCount,
            }),
            { total: 0, pending: 0, approved: 0, rejected: 0 }
          )
        );
      })
      .catch((err) =>
        setLoadError(err.response?.data?.error?.message ?? '현황을 불러오지 못했습니다.'),
      );
  }, []);

  const cards = [
    ['전체 신청 건수', stats.total, ''],
    ['심사 대기 건수', stats.pending, 'text-amber-600'],
    ['최종 승인 완료', stats.approved, 'text-emerald-600'],
    ['신청 반려 내역', stats.rejected, 'text-red-600'],
  ];

  return (
    <div>
      <PageHero eyebrow="EXHIBITOR MANAGEMENT PORTAL" title="관리자 대시보드" description="전체 박람회 운영 현황을 한눈에 확인합니다." />
      <PageContainer className="flex flex-col gap-6">
        {loadError && <EmptyState tone="error" className="my-0">{loadError}</EmptyState>}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map(([label, value, tone]) => (
            <Card key={label}>
              <CardContent>
                <p className="m-0 text-xs text-muted-foreground">{label}</p>
                <strong className={cn('mt-1 block text-3xl font-extrabold', tone)}>{value}건</strong>
              </CardContent>
            </Card>
          ))}
        </section>
      </PageContainer>
    </div>
  );
}

export default AdminDashboard;
