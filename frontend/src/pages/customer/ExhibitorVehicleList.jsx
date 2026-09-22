import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import ReviewWriteModal from '../../components/customer/ReviewWriteModal';
import ReviewDetailModal from '../../components/customer/ReviewDetailModal';
import BulkConsultPromo from '../../components/customer/BulkConsultPromo';
import { getBoothReviews, getCustomerExpo, getCustomerExpoVehicles, toAssetUrl } from '../../api/expo';
import { EmptyState, PageContainer, PageHero } from '@/components/layout/Page';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const fmtDate = (iso) => (iso ? iso.slice(0, 10).replace(/-/g, '.') : '');

// 참가업체 1곳의 전시 차량 목록 - ExhibitorList.jsx에서 업체 카드를 클릭하면 들어온다.
function ExhibitorVehicleList() {
  const { expoId, boothId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [expo, setExpo] = useState(null);
  const [group, setGroup] = useState(null);
  const [groups, setGroups] = useState([]); // 일괄 상담 신청 모달에서 고를 전체 참가업체
  const [loadError, setLoadError] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [reviews, setReviews] = useState(null);
  const [reviewTab, setReviewTab] = useState('CONSULT');
  const [selectedReview, setSelectedReview] = useState(null);
  const writeReviewType = searchParams.get('writeReview'); // 마이페이지(예약한 상담)에서 넘어오면 바로 작성 모달을 연다
  const closeWriteReview = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('writeReview');
    next.delete('vehicleName');
    setSearchParams(next, { replace: true });
  };

  const loadReviews = () =>
    getBoothReviews(boothId)
      .then(setReviews)
      .catch(() => setReviews({ totalCount: 0, consultReviews: [], boothReviews: [] }));

  useEffect(() => {
    Promise.all([getCustomerExpo(expoId), getCustomerExpoVehicles(expoId)])
      .then(([expoRes, groupsRes]) => {
        setExpo(expoRes);
        setGroups(groupsRes);
        const found = groupsRes.find((g) => String(g.boothId) === boothId);
        if (!found) {
          setLoadError('참가업체 정보를 찾을 수 없습니다.');
          return;
        }
        setGroup(found);
      })
      .catch((err) =>
        setLoadError(err.response?.data?.error?.message ?? '박람회 정보를 불러오지 못했습니다.')
      );
  }, [expoId, boothId]);

  useEffect(() => {
    loadReviews();
  }, [boothId]);

  const filteredVehicles = useMemo(
    () => group?.vehicles.filter((v) => v.name.toLowerCase().includes(keyword.toLowerCase())) ?? [],
    [group, keyword]
  );

  if (loadError) {
    return <EmptyState tone="error">{loadError}</EmptyState>;
  }
  if (!expo || !group) {
    return <EmptyState>불러오는 중...</EmptyState>;
  }

  const reviewList = reviewTab === 'CONSULT' ? reviews?.consultReviews : reviews?.boothReviews;

  return (
    <div>
      <PageHero
        eyebrow="EXHIBITION MANAGEMENT PORTAL"
        title={expo.title}
        description={`${fmtDate(expo.startsAt)} ~ ${fmtDate(expo.endsAt)} | ${expo.venue}`}
      />

      <PageContainer>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            to={`/customer/expos/${expoId}`}
            className="flex items-center gap-1 text-sm text-muted-foreground no-underline hover:text-foreground"
          >
            <ChevronLeft className="size-4" /> 참가업체 목록으로
          </Link>
          <div className="relative w-full max-w-xs">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 pl-8"
              placeholder="차량명을 검색하세요."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[1fr_300px]">
          <div className="flex min-w-0 flex-col gap-10">
            <section>
              <div className="mb-4 flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-base font-bold text-primary">
                  {group.title.slice(0, 1)}
                </span>
                <h2 className="m-0 text-xl font-bold">{group.title}</h2>
                <Badge variant="secondary">부스 {group.boothNo}</Badge>
              </div>

              {filteredVehicles.length === 0 && <EmptyState>조건에 맞는 차량이 없습니다.</EmptyState>}

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredVehicles.map((v) => (
                  <Link key={v.vehicleId} to={`/customer/expos/${expoId}/vehicles/${v.vehicleId}`} className="no-underline">
                    <Card className="h-full gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md">
                      <div className="aspect-[4/3] bg-muted">
                        {v.images[0] && (
                          <img src={toAssetUrl(v.images[0].imageUrl)} alt={v.name} className="size-full object-cover" />
                        )}
                      </div>
                      <CardContent className="flex flex-col gap-2 p-4">
                        <h3 className="m-0 text-base font-semibold text-foreground">{v.name}</h3>
                        <div className="flex flex-wrap gap-1">
                          {v.tags.map((t) => (
                            <Badge key={t} variant="secondary" className="font-normal">
                              {t}
                            </Badge>
                          ))}
                        </div>
                        <span className="mt-1 flex items-center gap-0.5 text-sm font-medium text-primary">
                          상세보기 <ChevronRight className="size-4" />
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="m-0 text-xl font-bold">후기 내역</h2>
                  <p className="mt-1 mb-0 text-sm text-muted-foreground">
                    해당 차량 및 부스와 관련된 방문 후기를 확인할 수 있습니다.
                  </p>
                </div>
                {reviews && (
                  <p className="m-0 text-sm text-muted-foreground">
                    전체 <strong className="text-foreground">{reviews.totalCount}</strong>건
                  </p>
                )}
              </div>

              <Tabs value={reviewTab} onValueChange={setReviewTab} className="mb-3">
                <TabsList>
                  <TabsTrigger value="CONSULT">상담후기</TabsTrigger>
                  <TabsTrigger value="BOOTH">부스후기</TabsTrigger>
                </TabsList>
              </Tabs>

              {!reviewList ? (
                <EmptyState>불러오는 중...</EmptyState>
              ) : reviewList.length === 0 ? (
                <EmptyState>아직 등록된 후기가 없습니다.</EmptyState>
              ) : (
                <div className="flex flex-col gap-2">
                  {reviewList.map((r) => (
                    <button
                      type="button"
                      key={r.reviewId}
                      className="flex w-full cursor-pointer items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50"
                      onClick={() => setSelectedReview(r)}
                    >
                      <div className="w-24 shrink-0">
                        <div className="text-sm font-semibold">{r.customerName}</div>
                        <div className="text-xs text-muted-foreground">{fmtDate(r.createdAt)}</div>
                      </div>
                      {r.images?.[0] && (
                        <img
                          src={toAssetUrl(r.images[0].imageUrl)}
                          alt=""
                          className="size-14 shrink-0 rounded-lg object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <Badge variant="secondary" className="mb-1">
                          {r.vehicleName || `부스 ${r.boothNo}`}
                        </Badge>
                        <div className="line-clamp-2 text-sm text-muted-foreground">{r.content}</div>
                      </div>
                      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>

          <BulkConsultPromo expoId={expoId} groups={groups} lockedBoothId={boothId} />
        </div>
      </PageContainer>

      {writeReviewType && (
        <ReviewWriteModal
          boothId={boothId}
          consultationId={searchParams.get('consultationId')}
          defaultType={writeReviewType}
          defaultVehicleName={searchParams.get('vehicleName') ?? ''}
          lockType
          onClose={closeWriteReview}
          onCreated={() => {
            closeWriteReview();
            loadReviews();
          }}
        />
      )}

      {selectedReview && <ReviewDetailModal review={selectedReview} onClose={() => setSelectedReview(null)} />}
    </div>
  );
}

export default ExhibitorVehicleList;
