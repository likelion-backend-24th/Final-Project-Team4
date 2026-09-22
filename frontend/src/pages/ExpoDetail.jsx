import { Calendar, CircleUser, Globe, Headset, MapPin, X } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getExpoBooths, getExpoList, toAssetUrl } from '../api/expo';
import HallMap, { HallPlaza } from '../components/HallMap';
import { getBoothHall, getSelectedKind } from '../utils/boothType';
import { phaseOf } from '../utils/expoPhase';
import { EmptyState, PageContainer } from '@/components/layout/Page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// 모집중이 아닌 단계에서 신청 버튼에 보여줄 안내 문구
const CTA_BLOCKED_TEXT = {
  모집예정: '모집 시작 전입니다',
  모집마감: '모집이 마감되었습니다',
  진행중: '모집이 마감되었습니다',
  종료: '행사가 종료되었습니다',
};

// ISO(2026-05-12T10:00:00) → 2026.05.12
const fmtDate = (iso) => (iso ? iso.slice(0, 10).replace(/-/g, '.') : '-');

function Legend({ title, items }) {
  return (
    <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
      <p className="m-0 font-semibold text-foreground">{title}</p>
      {items.map(([cls, label]) => (
        <span key={label} className="flex items-center gap-2">
          <i className={cn('inline-block size-3 rounded-sm border', cls)} />
          {label}
        </span>
      ))}
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border p-4">
      <Icon className="mt-0.5 size-5 text-muted-foreground" />
      <div>
        <p className="m-0 text-xs text-muted-foreground">{label}</p>
        <p className="m-0 mt-0.5 text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function ExpoDetail() {
  const { expoId } = useParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState(null); // getExpoBooths 응답 (title, 집계, booths)
  const [summary, setSummary] = useState(null); // 목록 응답에서 찾은 날짜·장소
  const [loadError, setLoadError] = useState(null);
  const [tab, setTab] = useState('map');
  const [selectedBoothIds, setSelectedBoothIds] = useState([]); // 부스 배치도에서 다중 선택된 부스 ID 목록
  const [hallFilter, setHallFilter] = useState('전체');

  useEffect(() => {
    Promise.all([getExpoBooths(expoId), getExpoList({ page: 0, size: 50 })])
      .then(([boothsRes, listRes]) => {
        setDetail(boothsRes);
        setSummary(listRes.content.find((e) => String(e.expoId) === expoId) ?? null);
      })
      .catch((err) =>
        setLoadError(err.response?.data?.error?.message ?? '박람회 정보를 불러오지 못했습니다.')
      );
  }, [expoId]);

  const phase = summary ? phaseOf(summary) : '모집예정';
  const canApply = phase === '모집중';

  const booths = detail?.booths ?? [];
  const halls = useMemo(
    () => [...new Set(booths.map((b) => getBoothHall(b.boothNo)))].sort(),
    [booths],
  );
  const visibleHalls = hallFilter === '전체' ? halls : halls.filter((h) => h === hallFilter);
  const selectedBooths = booths.filter((b) => selectedBoothIds.includes(b.boothId ?? b.id));
  const totalFee = selectedBooths.reduce((sum, b) => sum + b.fee, 0);
  const selectedKind = getSelectedKind(booths, selectedBoothIds); // 먹거리/조립 중 한 종류만 선택 가능

  if (loadError) {
    return <EmptyState tone="error">{loadError}</EmptyState>;
  }
  if (!detail) {
    return <EmptyState>불러오는 중...</EmptyState>;
  }

  // 부스 배치도에서 부스를 클릭할 때마다 선택 목록에 추가/제거 (다중 선택)
  const toggleBoothSelection = (id) =>
    setSelectedBoothIds((prev) =>
      prev.includes(id) ? prev.filter((existingId) => existingId !== id) : [...prev, id]
    );

  const goApply = () => {
    if (!canApply) return;
    const query = selectedBoothIds.map((id) => `boothId=${id}`).join('&');
    navigate(`/expos/${expoId}/apply${query ? `?${query}` : ''}`);
  };

  const heroStyle = summary?.bannerImageUrl
    ? {
        backgroundImage: `linear-gradient(120deg, rgba(11,18,32,0.85) 0%, rgba(28,42,74,0.75) 100%), url(${toAssetUrl(summary.bannerImageUrl)})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : undefined;

  return (
    <div className="pb-24">
      <section className="bg-slate-900 px-4 py-12 text-white md:px-8" style={heroStyle}>
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge>{phase}</Badge>
            <Badge variant="secondary" className="bg-white/15 text-white">
              신청 가능 부스 {detail.availableCount}개
            </Badge>
          </div>
          <h1 className="m-0 text-3xl font-bold tracking-tight md:text-4xl">{detail.title}</h1>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-200">
            <span className="flex items-center gap-1.5">
              <Calendar className="size-4" />
              {fmtDate(summary?.startsAt)} ~ {fmtDate(summary?.endsAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4" />
              {summary?.venue ?? '-'}
            </span>
          </div>
        </div>
      </section>

      <PageContainer>
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
          <Tabs value={tab} onValueChange={setTab} className="min-w-0">
            <TabsList>
              <TabsTrigger value="map">부스 배치도</TabsTrigger>
              <TabsTrigger value="overview">개요</TabsTrigger>
            </TabsList>

            <TabsContent value="map">
              <Card>
                <CardContent className="grid gap-5 md:grid-cols-[160px_1fr]">
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-wrap gap-1.5 md:flex-col">
                      <Button
                        type="button"
                        size="sm"
                        variant={hallFilter === '전체' ? 'default' : 'outline'}
                        onClick={() => setHallFilter('전체')}
                      >
                        전체
                      </Button>
                      {halls.map((h) => (
                        <Button
                          key={h}
                          type="button"
                          size="sm"
                          variant={hallFilter === h ? 'default' : 'outline'}
                          onClick={() => setHallFilter(h)}
                        >
                          {h}홀
                        </Button>
                      ))}
                    </div>
                    <Legend
                      title="부스 유형"
                      items={[
                        ['border-blue-100 bg-blue-50', '참가 부스'],
                        ['border-orange-200 bg-orange-50', '먹거리 부스'],
                        ['border-green-300 bg-green-100', '휴게 공간'],
                      ]}
                    />
                    <Legend
                      title="부스 상태"
                      items={[
                        ['border-blue-100 bg-blue-50', '신청 가능'],
                        ['border-slate-900 bg-slate-900', '마감 (배정·결제대기)'],
                        ['border-primary bg-primary', '선택한 부스'],
                      ]}
                    />
                  </div>

                  <div className="flex min-w-0 gap-4 overflow-x-auto pb-2">
                    {visibleHalls.map((h, i) => (
                      <Fragment key={h}>
                        {i > 0 && <HallPlaza />}
                        <HallMap
                          hallName={h}
                          booths={booths.filter((b) => getBoothHall(b.boothNo) === h)}
                          selectedBoothIds={selectedBoothIds}
                          onSelect={toggleBoothSelection}
                          selectedKind={selectedKind}
                          reverseFood={i % 2 === 1}
                        />
                      </Fragment>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="overview" className="flex flex-col gap-5">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">행사 소개</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
                  <p className="m-0 flex-1 text-sm leading-relaxed">
                    {summary?.description?.trim()
                      ? summary.description
                      : `${detail.title}은(는) 다양한 브랜드와 참가업체가 한자리에 모이는 박람회입니다. 풍성한 부스와 프로그램을 통해 새로운 비즈니스 기회를 만들어보세요.`}
                  </p>
                  <div
                    className="flex min-h-28 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-blue-900 px-6 text-center text-sm font-semibold text-white sm:w-56"
                    aria-hidden="true"
                  >
                    Mobility for a Better Tomorrow
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">행사 정보</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <InfoCard icon={Calendar} label="행사 기간" value={`${fmtDate(summary?.startsAt)} ~ ${fmtDate(summary?.endsAt)}`} />
                  <InfoCard icon={MapPin} label="행사 장소" value={summary?.venue ?? '-'} />
                  <InfoCard icon={CircleUser} label="주최 / 주관" value="㈜팀포 박람회 사무국" />
                  <InfoCard icon={Globe} label="홈페이지" value="추후 공개 예정" />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <aside className="lg:sticky lg:top-24">
            <Card>
              <CardContent className="flex flex-col gap-4">
                {tab === 'map' ? (
                  selectedBooths.length > 0 ? (
                    <>
                      <Badge className="w-fit">{selectedBooths.length}개 부스 선택됨</Badge>
                      <h3 className="m-0 text-base font-semibold">선택한 부스</h3>
                      <ul className="m-0 flex max-h-60 list-none flex-col gap-2 overflow-y-auto p-0">
                        {selectedBooths.map((b) => (
                          <li key={b.boothId ?? b.id} className="flex items-center justify-between gap-2 rounded-lg border p-2.5">
                            <div className="min-w-0">
                              <strong className="block text-sm">{b.boothNo}</strong>
                              <span className="text-xs text-muted-foreground">
                                {getBoothHall(b.boothNo)}홀 · {b.type}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-sm">
                              <span>{b.fee.toLocaleString()}원</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => toggleBoothSelection(b.boothId ?? b.id)}
                                aria-label={`${b.boothNo} 선택 해제`}
                              >
                                <X />
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="m-0 text-xs text-muted-foreground">임차료 합계</p>
                        <p className="m-0 mt-0.5 text-lg font-bold">{totalFee.toLocaleString()} 원</p>
                      </div>
                      <Button type="button" size="lg" onClick={goApply} disabled={!canApply}>
                        {canApply ? `${selectedBooths.length}개 부스 선택 및 신청하기` : CTA_BLOCKED_TEXT[phase]}
                      </Button>
                    </>
                  ) : (
                    <p className="m-0 text-sm leading-relaxed text-muted-foreground">
                      부스를 클릭해서 선택하세요. (같은 종류의 부스는 여러 개 함께 선택할 수 있고, 먹거리 부스와 조립 부스는 따로 신청해야 해요)
                    </p>
                  )
                ) : (
                  <>
                    <h3 className="m-0 text-base font-semibold">부스 참가 안내</h3>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="m-0 text-xs text-muted-foreground">신청 기간</p>
                      <p className="m-0 mt-0.5 text-sm font-semibold">
                        {fmtDate(summary?.applyStartsAt)} ~ {fmtDate(summary?.applyEndsAt)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="m-0 text-xs text-muted-foreground">제공 혜택</p>
                      <p className="m-0 mt-0.5 text-sm font-semibold">무료 무선인터넷, 기본 전력 1kW 제공</p>
                    </div>
                    <Button type="button" size="lg" onClick={goApply} disabled={!canApply}>
                      {canApply ? '부스 선택 및 신청하기' : CTA_BLOCKED_TEXT[phase]}
                    </Button>
                    <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                      <h4 className="m-0 mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <Headset className="size-4" /> 문의 안내
                      </h4>
                      <p className="m-0">운영 사무국</p>
                      <p className="m-0">02-6000-0000</p>
                      <p className="m-0">expo-help@example.com</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </PageContainer>

      <footer className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t bg-background/95 px-4 py-3 backdrop-blur md:px-8">
        <div className="min-w-0">
          <strong className="block truncate text-sm">{detail.title}</strong>
          {detail.booths[0] && (
            <span className="text-xs text-muted-foreground">예상 참가비 {detail.booths[0].fee.toLocaleString()} 원 ~</span>
          )}
        </div>
        <Button type="button" onClick={goApply} disabled={!canApply}>
          {canApply ? '참가 신청하기' : CTA_BLOCKED_TEXT[phase]}
        </Button>
      </footer>
    </div>
  );
}

export default ExpoDetail;
