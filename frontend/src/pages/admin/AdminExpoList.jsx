import { Pencil, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminExpoList, toAssetUrl } from '../../api/expo';
import { phaseOf } from '../../utils/expoPhase';
import { AdminSidebarLayout } from '@/components/admin/AdminSidebarLayout';
import { EmptyState, PageHeader, Pagination } from '@/components/layout/Page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// 상단 필터 탭 - phaseOf()가 반환하는 5단계 그대로 사용 (ExpoList.jsx/CustomerExpoList.jsx와 동일한 구성)
const FILTERS = ['전체', '진행중', '모집중', '모집예정', '모집마감', '종료'];

// 정렬 옵션 - 기본값은 최근 등록순(요청사항: 최근 등록한 박람회가 좌측 최상단)
const SORTS = [
  { value: 'recent', label: '최신 등록순' },
  { value: 'oldest', label: '오래된 등록순' },
  { value: 'deadline', label: '신청 마감임박순' },
  { value: 'pending', label: '심사 대기 많은순' },
];

// 페이지당 카드 개수 선택지
const PAGE_SIZE_OPTIONS = [8, 12, 16, 24];

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
  const [filter, setFilter] = useState('전체');
  const [keyword, setKeyword] = useState('');
  const [sortOption, setSortOption] = useState(SORTS[0].value);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    getAdminExpoList()
      .then((res) => setExpos(res.content))
      .catch((err) => setLoadError(err.response?.data?.error?.message ?? '박람회 목록을 불러오지 못했습니다.'));
  }, []);

  // 진행 단계(phase)는 신청/개최 기간 기준으로 계산 - 비공개(DRAFT) 여부와는 별개 축이라 카드에는 따로 배지로 표시함
  const withPhase = useMemo(() => expos.map((e) => ({ ...e, phase: phaseOf(e) })), [expos]);

  // 탭별 건수는 검색어와 무관하게 전체 기준으로 계산(탭을 눌러보기 전에도 몇 건인지 알 수 있게)
  const filterCounts = useMemo(() => {
    const counts = { 전체: withPhase.length };
    for (const f of FILTERS.slice(1)) counts[f] = withPhase.filter((e) => e.phase === f).length;
    return counts;
  }, [withPhase]);

  const filtered = useMemo(() => {
    return withPhase.filter((e) => {
      const matchesFilter = filter === '전체' || e.phase === filter;
      const matchesKeyword = e.title.toLowerCase().includes(keyword.trim().toLowerCase());
      return matchesFilter && matchesKeyword;
    });
  }, [withPhase, filter, keyword]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    switch (sortOption) {
      case 'oldest':
        return list.sort((a, b) => a.expoId - b.expoId);
      case 'deadline':
        return list.sort((a, b) => new Date(a.applyEndsAt) - new Date(b.applyEndsAt));
      case 'pending':
        return list.sort((a, b) => b.pendingCount - a.pendingCount);
      case 'recent':
      default:
        return list.sort((a, b) => b.expoId - a.expoId);
    }
  }, [filtered, sortOption]);

  // 필터/검색/정렬/페이지 크기가 바뀌면 1페이지로
  useEffect(() => {
    setPage(1);
  }, [filter, keyword, sortOption, pageSize]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = useMemo(() => sorted.slice((page - 1) * pageSize, page * pageSize), [sorted, page, pageSize]);

  return (
    <AdminSidebarLayout breadcrumb="참가 신청 관리">
      <PageHeader title="참가 신청 관리" description="박람회를 선택하면 실시간 부스 배치 현황과 참가 신청 목록을 확인할 수 있습니다." />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
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
              <span className={f === filter ? 'opacity-80' : 'text-muted-foreground'}> {filterCounts[f] ?? 0}</span>
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 w-56 pl-8"
              placeholder="박람회명 검색..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          <Select value={sortOption} onValueChange={setSortOption}>
            <SelectTrigger className="h-9 w-40">
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
        </div>
      </div>

      {loadError && <EmptyState tone="error">{loadError}</EmptyState>}
      {sorted.length === 0 && !loadError && <EmptyState>조건에 맞는 박람회가 없습니다.</EmptyState>}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
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
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={expo.phase === '진행중' || expo.phase === '모집중' ? 'default' : 'secondary'}>
                    {expo.phase}
                  </Badge>
                  {expo.status === 'DRAFT' && <Badge variant="outline">비공개</Badge>}
                  {expo.pendingCount > 0 && (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                      심사 대기 {expo.pendingCount}건
                    </Badge>
                  )}
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

                <div className="flex items-center gap-2 border-t pt-3">
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/admin/applications/${expo.expoId}`);
                    }}
                  >
                    신청 목록 보기
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/admin/expos/${expo.expoId}/edit`);
                    }}
                  >
                    <Pencil /> 수정
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        <Pagination page={page} totalPages={totalPages} onChange={setPage} className="mt-0" />
        <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}개씩 보기
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </AdminSidebarLayout>
  );
}

export default AdminExpoList;