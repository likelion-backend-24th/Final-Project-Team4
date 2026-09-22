import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getBoothManageDetail, getBoothStats, getExhibitorBoothReviews, toAssetUrl } from '../api/expo';
import { EmptyState, PageContainer } from '@/components/layout/Page';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const STAT_TILES = [
  ['visitCount', '방문자'],
  ['requestedCount', '대기'],
  ['approvedCount', '승인'],
  ['completedCount', '완료'],
  ['rejectedCount', '반려'],
  ['noShowCount', '미방문'],
  ['canceledCount', '취소'],
];

// 참가업체가 본인 부스의 상담/방문 통계와 실명 후기를 확인하는 화면 - 마이페이지 "부스 참가 신청 현황"의
// 작은 📊 버튼으로 진입한다(부스 관리 화면과 분리, 2026-09-16 확정).
function BoothInsights() {
  const { boothId } = useParams();

  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState(null);
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(null);
  const [reviews, setReviews] = useState(null);
  const [reviewsError, setReviewsError] = useState(null);

  useEffect(() => {
    getBoothManageDetail(boothId)
      .then(setDetail)
      .catch((err) => setDetailError(err.response?.data?.error?.message ?? '부스 정보를 불러오지 못했습니다.'));
    getBoothStats(boothId)
      .then(setStats)
      .catch((err) => setStatsError(err.response?.data?.error?.message ?? '통계를 불러오지 못했습니다.'));
    getExhibitorBoothReviews(boothId)
      .then(setReviews)
      .catch((err) => setReviewsError(err.response?.data?.error?.message ?? '후기를 불러오지 못했습니다.'));
  }, [boothId]);

  return (
    <PageContainer size="md" className="flex flex-col gap-5">
      <div>
        <div className="mb-2 text-xs text-muted-foreground">
          <Link to="/mypage" className="text-muted-foreground no-underline hover:text-foreground">마이페이지</Link>
          {' > '}
          <span className="text-foreground">{detail ? `${detail.boothNo} 부스` : '부스'} 통계·후기</span>
        </div>
        <h1 className="m-0 text-2xl font-bold tracking-tight">방문 통계 &amp; 후기</h1>
        {detailError && <EmptyState tone="error">{detailError}</EmptyState>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">방문 통계</CardTitle>
          <CardDescription>상담 신청 현황과 방문자 수를 확인할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {statsError ? (
            <EmptyState tone="error">{statsError}</EmptyState>
          ) : !stats ? (
            <EmptyState>불러오는 중...</EmptyState>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {STAT_TILES.map(([key, label]) => (
                <div key={key} className="rounded-xl border bg-muted/30 p-4 text-center">
                  <span className="block text-2xl font-extrabold">{stats[key]}</span>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">후기</CardTitle>
          <CardDescription>고객이 남긴 상담후기/부스후기입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {reviewsError ? (
            <EmptyState tone="error">{reviewsError}</EmptyState>
          ) : !reviews ? (
            <EmptyState>불러오는 중...</EmptyState>
          ) : reviews.length === 0 ? (
            <EmptyState>아직 등록된 후기가 없습니다.</EmptyState>
          ) : (
            <div className="flex flex-col gap-3">
              {reviews.map((r) => (
                <div key={r.reviewId} className="rounded-xl border p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="secondary">{r.reviewType === 'CONSULT' ? '상담후기' : '부스후기'}</Badge>
                    <span className="font-semibold">{r.customerName}</span>
                    {r.vehicleName && <span className="text-muted-foreground">{r.vehicleName}</span>}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {r.createdAt ? r.createdAt.slice(0, 10).replace(/-/g, '.') : ''}
                    </span>
                  </div>
                  <p className="m-0 whitespace-pre-wrap text-sm leading-relaxed">{r.content}</p>
                  {r.images?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {r.images.map((img) => (
                        <img key={img.imageId} src={toAssetUrl(img.imageUrl)} alt="후기 사진" className="size-20 rounded-lg object-cover" />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

export default BoothInsights;
