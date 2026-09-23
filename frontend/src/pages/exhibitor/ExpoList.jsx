import { ArrowRight, Calendar, MapPin, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getExpoList, toAssetUrl } from "@/api/expo";
import { phaseOf } from "@/utils/expoPhase";
import { EmptyState, PageContainer, PageHero, Pagination } from "@/components/layout/Page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// 상단 필터 탭 목록 - phaseOf()가 반환하는 5가지 단계를 순서대로 전부 포함 (CustomerExpoList.jsx와 동일해야 함)
const FILTERS = ["전체", "진행중", "모집중", "모집예정", "모집마감", "종료"];

// 카드 목록 정렬 시 우선 적용할 진행 단계 우선순위 (숫자가 작을수록 위로)
const PHASE_ORDER = { 진행중: 0, 모집중: 1, 모집예정: 2, 모집마감: 3, 종료: 4 };

const PAGE_SIZE = 8;

// 부스 참가 신청을 받지 않는 단계. 모집예정은 부스 배치도까진 볼 수 있어야 해서 카드 자체는 막지 않음(ExpoDetail.jsx에서 신청 버튼만 막음)
const NOT_APPLICABLE = ["모집마감", "종료"];
const FOOTER_TEXT = {
  모집마감: "모집 마감",
  종료: "신청 종료",
};

// 정렬 기준 - 상태 탭과 무관하게 동일한 6가지 옵션을 공용으로 씀 (CustomerExpoList.jsx와 동일)
const SORTS = [
  { value: "start-asc", label: "시작일 오름차순", key: "startsAt", dir: "asc" },
  { value: "start-desc", label: "시작일 내림차순", key: "startsAt", dir: "desc" },
  { value: "deadline-asc", label: "신청 마감 오름차순", key: "applyEndsAt", dir: "asc" },
  { value: "deadline-desc", label: "신청 마감 내림차순", key: "applyEndsAt", dir: "desc" },
  { value: "end-asc", label: "종료일 오름차순", key: "endsAt", dir: "asc" },
  { value: "end-desc", label: "종료일 내림차순", key: "endsAt", dir: "desc" },
];

// 카드 썸네일에 순서대로 돌려가며 입힐 그라데이션 색상들
const GRADIENTS = [
  "linear-gradient(135deg, #1e293b, #0f172a)",
  "linear-gradient(135deg, #7f1d1d, #1f2937)",
  "linear-gradient(135deg, #0e7490, #0f172a)",
  "linear-gradient(135deg, #14532d, #0f172a)",
];

// ISO 날짜(2026-05-12T10:00:00) → 화면 표시용(2026.05.12)
const fmtDate = (iso) => (iso ? iso.slice(0, 10).replace(/-/g, ".") : "");

// 신청 마감까지 남은 일수를 D-day 형태로 표시 (지난 경우 "마감")
const dDayOf = (iso) => {
  const diff = Math.ceil((new Date(iso).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
  if (diff > 0) return `D-${diff}`;
  if (diff === 0) return "D-DAY";
  return "마감";
};

// 서버에서 받은 실제 박람회 데이터를 카드에서 쓰기 편한 형태로 변환 (정렬에 쓸 원본 날짜는 그대로 둠)
const toRealCard = (e) => ({
  key: `real-${e.expoId}`,
  expoId: e.expoId,
  title: e.title,
  phase: phaseOf(e),
  venue: e.venue,
  startsAt: e.startsAt,
  endsAt: e.endsAt,
  applyStartsAt: e.applyStartsAt,
  applyEndsAt: e.applyEndsAt,
  bannerImageUrl: e.bannerImageUrl,
});

function ExpoList() {
  // 서버에서 불러온 실제 박람회 카드 목록 (더미/예시 데이터는 사용하지 않음)
  const [cards, setCards] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [filter, setFilter] = useState("전체");
  const [sortOption, setSortOption] = useState(SORTS[0].value);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);

  // 컴포넌트가 처음 렌더링될 때 한 번만 박람회 목록을 서버에서 불러옴
  useEffect(() => {
    getExpoList({ page: 0, size: 50 })
      .then((res) => setCards(res.content.map(toRealCard)))
      .catch((err) =>
        setLoadError(err.response?.data?.error?.message ?? "박람회 목록을 불러오지 못했습니다."),
      );
  }, []);

  // 선택된 필터(상태 탭)와 검색어에 맞는 카드만 걸러내고 정렬함
  const filtered = useMemo(() => {
    const sort = SORTS.find((s) => s.value === sortOption);
    const dir = sort.dir === "asc" ? 1 : -1;
    return cards
      .filter((c) => {
        const matchesFilter = filter === "전체" || c.phase === filter;
        const matchesKeyword = c.title.toLowerCase().includes(keyword.toLowerCase());
        return matchesFilter && matchesKeyword;
      })
      .sort((a, b) => {
        const phaseDiff = PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase];
        if (phaseDiff !== 0) return phaseDiff;
        return dir * (new Date(a[sort.key]) - new Date(b[sort.key]));
      });
  }, [cards, filter, keyword, sortOption]);

  // 필터/정렬/검색 결과가 바뀌면 페이지를 1로 초기화
  useEffect(() => {
    setPage(1);
  }, [filter, sortOption, keyword]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  // 카드 하나의 내부 UI(썸네일 + 뱃지 + 제목 + 날짜/장소 + 하단 링크)
  const renderCard = (c, i) => {
    const closed = NOT_APPLICABLE.includes(c.phase);
    const dDay = dDayOf(c.applyEndsAt);
    return (
      <Card className={cn("h-full gap-0 overflow-hidden py-0 transition-shadow", closed ? "opacity-70" : "hover:shadow-md")}>
        <div
          className="h-36 bg-cover bg-center"
          style={
            c.bannerImageUrl
              ? { backgroundImage: `url(${toAssetUrl(c.bannerImageUrl)})` }
              : { background: GRADIENTS[i % GRADIENTS.length] }
          }
        />
        <CardContent className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <Badge variant={closed ? "secondary" : "default"}>{c.phase}</Badge>
            <span>
              신청마감 <strong className={dDay === "마감" ? "text-muted-foreground" : "text-destructive"}>{dDay}</strong>
            </span>
          </div>
          <h3 className="m-0 line-clamp-2 text-base font-semibold text-foreground">{c.title}</h3>
          <p className="m-0 text-xs text-muted-foreground">
            신청기간 {fmtDate(c.applyStartsAt)} - {fmtDate(c.applyEndsAt)}
          </p>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <p className="m-0 flex items-center gap-1.5">
              <Calendar className="size-4 shrink-0" />
              {fmtDate(c.startsAt)} - {fmtDate(c.endsAt)}
            </p>
            <p className="m-0 flex items-center gap-1.5">
              <MapPin className="size-4 shrink-0" />
              <span className="truncate">{c.venue}</span>
            </p>
          </div>
          <div className="mt-auto flex items-center justify-between border-t pt-3 text-sm font-medium">
            <span className={closed ? "text-muted-foreground" : "text-primary"}>
              {FOOTER_TEXT[c.phase] ?? "상세 보기 및 부스 신청"}
            </span>
            {!closed && <ArrowRight className="size-4 text-primary" />}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div>
      <PageHero
        eyebrow="ONLINE REGISTRATION PORTAL"
        title="박람회 참가 신청"
        description="현재 모집 중이거나 진행 예정인 모빌리티 분야 전문 박람회의 부스 참가 신청을 접수하고 있습니다."
      />

      <div className="border-b border-border bg-background">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-8">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <Button
                key={f}
                type="button"
                size="sm"
                variant={f === filter ? "default" : "outline"}
                className="rounded-full"
                onClick={() => setFilter(f)}
              >
                {f}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={sortOption} onValueChange={setSortOption} modal={false}>
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
                placeholder="박람회 명칭 검색..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <PageContainer>
        {loadError && <EmptyState tone="error">{loadError}</EmptyState>}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paginated.map((c, i) =>
            // 모집마감/종료는 부스 신청 자체가 불가능하므로 클릭해서 들어가지 못하게 막음
            NOT_APPLICABLE.includes(c.phase) ? (
              <div key={c.key} className="cursor-not-allowed">
                {renderCard(c, i)}
              </div>
            ) : (
              <Link key={c.key} to={`/expos/${c.expoId}`} className="no-underline">
                {renderCard(c, i)}
              </Link>
            ),
          )}
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </PageContainer>
    </div>
  );
}

export default ExpoList;
