import { useEffect, useMemo, useState } from 'react';
import { Calendar, MapPin, Search, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import EntryFlowModal from '../../components/customer/EntryFlowModal';
import { getCustomerExpoList, searchVehicles, toAssetUrl } from '../../api/expo';
import { phaseOf, customerPhaseOf } from '../../utils/expoPhase';
import { CUSTOMER_EXPO_GRADIENTS } from '../../mock/customerData';
import { EmptyState, PageContainer, PageHero, Pagination } from '@/components/layout/Page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// customerPhaseOf()가 반환하는 4가지 단계 (부스 모집중/모집마감은 방문객 기준 "예약가능"으로 통합)
const FILTERS = ["전체", "예약가능", "진행중", "오픈예정", "종료"];

// 관리자가 일정 변경 시 막는 장치가 없어(Expo 쪽 가드는 부스 신청 여부만 봄) 기존 고객 QR이 고아가 될 수 있음.
// 모집중 이후 구간은 나중에 알림 기능에서 "일정 변경 시 기존 QR 취소 + 알림"으로 별도 처리 해야함.
const NOT_BOOKABLE = ["모집예정", "종료"];
const CTA_TEXT = { 모집예정: "모집 예정", 종료: "종료" };

// 정렬 기준 - 상태 탭과 무관하게 동일한 6가지 옵션을 공용으로 씀
const SORTS = [
  { value: 'start-asc', label: '시작일 오름차순', key: 'startsAt', dir: 'asc' },
  { value: 'start-desc', label: '시작일 내림차순', key: 'startsAt', dir: 'desc' },
  { value: 'deadline-asc', label: '신청 마감 오름차순', key: 'applyEndsAt', dir: 'asc' },
  { value: 'deadline-desc', label: '신청 마감 내림차순', key: 'applyEndsAt', dir: 'desc' },
  { value: 'end-asc', label: '종료일 오름차순', key: 'endsAt', dir: 'asc' },
  { value: 'end-desc', label: '종료일 내림차순', key: 'endsAt', dir: 'desc' },
];

// 한 페이지에서 보여줄 카드 개수 - 초과될 경우 하단에 페이지 넘버링
const PAGE_SIZE = 8;

const fmtDate = (iso) => (iso ? iso.slice(0, 10).replace(/-/g, '.') : '');

// 서버에서 받은 실제 박람회 데이터를 카드에서 쓰기 편한 형태로 변환
const toCard = (e) => ({
  expoId: e.expoId,
  title: e.title,
  venue: e.venue,
  description: e.description,
  startsAt: e.startsAt,
  endsAt: e.endsAt,
  applyStartsAt: e.applyStartsAt,
  applyEndsAt: e.applyEndsAt,
  admissionFee: e.admissionFee,
  boothCount: e.boothCount,
  bannerImageUrl: e.bannerImageUrl,
  phase: phaseOf(e),
  customerPhase: customerPhaseOf(e),
});

function CustomerExpoList() {
  // 실제 박람회 목록 (더미 데이터는 사용하지 않음)
  const [expos, setExpos] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [filter, setFilter] = useState('전체');
  const [sortOption, setSortOption] = useState(SORTS[0].value);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [checkinExpo, setCheckinExpo] = useState(null);

  // AI 자연어 차량 검색 - 위 keyword(박람회명 필터)와 별개. 현재 노출 중인 박람회 전체의 차량이 대상.
  const [aiQuery, setAiQuery] = useState('');
  const [aiSearching, setAiSearching] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiResult, setAiResult] = useState(null); // { results, interpretedSummary } | null(검색 전)

  const handleAiSearch = (e) => {
    e.preventDefault();
    if (!aiQuery.trim() || aiSearching) return;
    setAiSearching(true);
    setAiError(null);
    searchVehicles(aiQuery.trim())
      .then((res) => setAiResult(res))
      .catch((err) =>
        setAiError(err.response?.data?.error?.message ?? '검색 중 오류가 발생했습니다.'),
      )
      .finally(() => setAiSearching(false));
  };

  const clearAiSearch = () => {
    setAiQuery('');
    setAiResult(null);
    setAiError(null);
  };

  useEffect(() => {
    getCustomerExpoList({ page: 0, size: 50 })
      .then((res) => setExpos(res.content.map(toCard)))
      .catch((err) =>
        setLoadError(err.response?.data?.error?.message ?? '박람회 목록을 불러오지 못했습니다.'),
      );
  }, []);

  const filtered = useMemo(() => {
    const sort = SORTS.find((s) => s.value === sortOption);
    const dir = sort.dir === 'asc' ? 1 : -1;
    return expos
      .filter((e) => {
        const matchesFilter = filter === '전체' ? e.customerPhase !== '종료' : e.customerPhase === filter;
        const matchesKeyword = e.title.toLowerCase().includes(keyword.toLowerCase());
        return matchesFilter && matchesKeyword;
      })
        .sort((a, b) => dir * (new Date(a[sort.key]) - new Date(b[sort.key])));
  }, [expos, filter, keyword, sortOption]);

  useEffect(() => {
    setPage(1);
  }, [filter, sortOption, keyword]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  return (
    <div>
      <PageHero
        eyebrow="EXHIBITION MANAGEMENT PORTAL"
        title="박람회 목록"
        description="다양한 모빌리티 박람회를 확인하고, 관심 있는 박람회를 선택해 보세요."
      >
        <form
          className="mt-6 flex max-w-3xl flex-wrap items-center gap-2 rounded-xl bg-white p-2 shadow-lg"
          onSubmit={handleAiSearch}
        >
          <Sparkles className="ml-2 size-5 shrink-0 text-primary" aria-hidden="true" />
          <Input
            className="h-10 min-w-0 flex-1 border-0 bg-transparent text-slate-900 shadow-none focus-visible:ring-0"
            placeholder='어떤 차량을 찾으세요? 예: "3000만원대 가솔린 SUV", "가족끼리 타기 좋은 차"'
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
          />
          {aiResult && (
            <Button type="button" variant="ghost" size="sm" className="text-slate-500" onClick={clearAiSearch}>
              <X /> 검색 지우기
            </Button>
          )}
          <Button type="submit" className="h-10" disabled={aiSearching}>
            {aiSearching ? '검색 중...' : 'AI 검색'}
          </Button>
        </form>
      </PageHero>

      {aiResult ? (
        <PageContainer>
          {aiError && <EmptyState tone="error">{aiError}</EmptyState>}
          {aiResult.interpretedSummary && (
            <p className="mb-4 rounded-lg bg-primary/5 px-4 py-3 text-sm text-primary">
              👾 {aiResult.interpretedSummary}
            </p>
          )}
          {aiResult.results.length === 0 ? (
            <EmptyState>조건에 맞는 차량을 찾지 못했어요. 다른 표현으로 검색해보세요.</EmptyState>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {aiResult.results.map(({ expoId, expoTitle, boothNo, companyName, vehicle }) => (
                <Link
                  key={vehicle.vehicleId}
                  to={`/customer/expos/${expoId}/vehicles/${vehicle.vehicleId}`}
                  className="no-underline"
                >
                  <Card className="h-full transition-shadow hover:shadow-md">
                    <CardContent className="flex flex-col gap-1.5">
                      <h3 className="m-0 text-base font-semibold text-foreground">{vehicle.name}</h3>
                      <p className="m-0 text-xs text-muted-foreground">
                        {expoTitle} · {companyName ?? `${boothNo} 부스`}
                      </p>
                      {vehicle.startPrice != null && (
                        <p className="m-0 text-sm font-semibold text-primary">{vehicle.startPrice.toLocaleString()}원~</p>
                      )}
                      {vehicle.summary && (
                        <p className="m-0 line-clamp-2 text-sm text-muted-foreground">{vehicle.summary}</p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </PageContainer>
      ) : (
        <>
          <div className="border-b border-border bg-background">
            <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-8">
              <div className="flex flex-wrap gap-1.5">
                {FILTERS.map((f) => (
                  <Button
                    key={f}
                    type="button"
                    size="sm"
                    variant={f === filter ? 'default' : 'outline'}
                    className="rounded-full"
                    onClick={() => setFilter(f)}
                  >
                    {f}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={sortOption} onValueChange={setSortOption}>
                  <SelectTrigger className="h-9 w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORTS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-9 w-64 pl-8"
                    placeholder="박람회명 또는 지역을 검색하세요."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <PageContainer>
            {loadError && <EmptyState tone="error">{loadError}</EmptyState>}
            {!loadError && filtered.length === 0 && <EmptyState>표시할 박람회가 없습니다.</EmptyState>}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {paginated.map((e, i) => (
                <Card key={e.expoId} className="gap-0 overflow-hidden py-0">
                  <div
                    className="h-36 bg-cover bg-center"
                    style={
                      e.bannerImageUrl
                        ? { backgroundImage: `url(${toAssetUrl(e.bannerImageUrl)})` }
                        : { background: CUSTOMER_EXPO_GRADIENTS[i % CUSTOMER_EXPO_GRADIENTS.length] }
                    }
                  />
                  <CardContent className="flex flex-1 flex-col gap-3 p-4">
                    <div>
                      <Badge variant={e.customerPhase === '종료' ? 'secondary' : 'default'}>{e.customerPhase}</Badge>
                    </div>
                    <h3 className="m-0 line-clamp-2 text-base font-semibold">{e.title}</h3>
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                      <p className="m-0 flex items-center gap-1.5">
                        <Calendar className="size-4 shrink-0" />
                        {fmtDate(e.startsAt)} - {fmtDate(e.endsAt)}
                      </p>
                      <p className="m-0 flex items-center gap-1.5">
                        <MapPin className="size-4 shrink-0" />
                        <span className="truncate">{e.venue}</span>
                      </p>
                    </div>
                    <Button
                      type="button"
                      className="mt-auto w-full"
                      disabled={NOT_BOOKABLE.includes(e.phase)}
                      onClick={() => setCheckinExpo(e)}
                    >
                      {CTA_TEXT[e.phase] ?? '선택하기'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </PageContainer>
        </>
      )}

      {checkinExpo && (
        <EntryFlowModal expo={checkinExpo} onClose={() => setCheckinExpo(null)} />
      )}
    </div>
  );
}

export default CustomerExpoList;
