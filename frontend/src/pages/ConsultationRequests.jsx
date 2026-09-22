import { useEffect, useMemo, useState } from 'react';
import {
  approveConsultation,
  completeConsultation,
  getExhibitorConsultations,
  getMyBoothApplications,
  markConsultationNoShow,
  regenerateConsultationAiSummary,
  rejectConsultation,
} from '../api/expo';
import { Search, Sparkles } from 'lucide-react';
import { EmptyState, PageContainer, PageHero, Pagination } from '@/components/layout/Page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const STATUS_LABEL = {
  REQUESTED: '승인 대기',
  APPROVED: '승인',
  REJECTED: '반려',
  CANCELED: '고객 취소',
  COMPLETED: '상담 완료',
  NO_SHOW: '미방문',
};
const STATUS_BADGE = {
  REQUESTED: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELED: 'bg-slate-100 text-slate-600',
  COMPLETED: 'bg-blue-100 text-blue-700',
  NO_SHOW: 'bg-slate-100 text-slate-600',
};
const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

// 방문 예정일 다음날부터 완료/미방문 처리 가능 (당일엔 아직 방문 여부를 알 수 없음).
const isPastVisitDate = (dateStr) => {
  const target = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return target < today;
};

// ISO(2026-05-12T10:00:00) → 화면 표시용(2026.05.12 10:00)
const fmtDateTime = (iso) => (iso ? iso.slice(0, 16).replace('T', ' ').replace(/-/g, '.') : '-');
// 'YYYY-MM-DD' → 'MM/DD'
const fmtShortDate = (dateStr) => (dateStr ? dateStr.slice(5).replace('-', '/') : '-');

function visitDateCategory(dateStr) {
  const target = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target - today) / 86400000);
  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '내일';
  if (diffDays >= 0 && diffDays <= 6) return '이번 주';
  return null;
}

const PAGE_SIZE = 10;

// 참가업체 - 본인 부스로 들어온 차량 구매/시승 상담 신청 조회·승인·반려 (TASK 6-3)
function ConsultationRequests() {
  const [consultations, setConsultations] = useState([]);
  const [boothInfoMap, setBoothInfoMap] = useState({}); // boothId -> { expoTitle, boothNo }
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [filterExpo, setFilterExpo] = useState('전체 박람회');
  const [filterStatus, setFilterStatus] = useState('전체 상태');
  const [filterType, setFilterType] = useState('전체 상담 유형');
  const [filterVisitDate, setFilterVisitDate] = useState('전체 방문일');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const [selectedId, setSelectedId] = useState(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const loadBoothInfo = () =>
    getMyBoothApplications({ size: 200 }).then((res) => {
      const map = {};
      res.content.forEach((group) => {
        group.applications.forEach((app) => {
          map[app.boothId] = { expoTitle: group.expoTitle, boothNo: app.boothNo };
        });
      });
      setBoothInfoMap(map);
    });

  const load = () => {
    getExhibitorConsultations()
      .then((data) => {
        setConsultations(data);
        setLoadError(null);
      })
      .catch((err) =>
        setLoadError(err.response?.data?.error?.message ?? '상담 신청 목록을 불러오지 못했습니다.')
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    loadBoothInfo().catch(() => {});
  }, []);

  // 화면에 필요한 형태로 가공: 박람회/부스 정보를 붙인다.
  const rows = useMemo(
    () =>
      consultations.map((c) => {
        const boothInfo = boothInfoMap[c.boothId];
        const typeLabel = [c.wantsPurchase && '구매', c.wantsTestDrive && '시승'].filter(Boolean).join(' + ');
        return {
          ...c,
          expoTitle: boothInfo?.expoTitle ?? '박람회 정보 확인 중...',
          boothNo: boothInfo?.boothNo ?? `부스 #${c.boothId}`,
          typeLabel,
          statusLabel: STATUS_LABEL[c.status] ?? c.status,
        };
      }),
    [consultations, boothInfoMap]
  );

  const expoOptions = useMemo(() => ['전체 박람회', ...new Set(rows.map((r) => r.expoTitle))], [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterExpo !== '전체 박람회' && r.expoTitle !== filterExpo) return false;
      if (filterStatus !== '전체 상태' && r.statusLabel !== filterStatus) return false;
      if (filterType !== '전체 상담 유형' && r.typeLabel !== filterType) return false;
      if (filterVisitDate !== '전체 방문일' && visitDateCategory(r.preferredDate) !== filterVisitDate) return false;
      if (q) {
        const haystack = `${r.customerName ?? ''} ${r.customerPhone ?? ''} ${r.interestedVehicle ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filterExpo, filterStatus, filterType, filterVisitDate, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  // Select(onValueChange는 값을 바로 넘김)와 Input(onChange는 이벤트를 넘김) 둘 다 받는다.
  const setFilterAndResetPage = (setter) => (e) => {
    setter(e?.target ? e.target.value : e);
    setPage(0);
  };

  const stats = useMemo(
    () => ({
      total: rows.length,
      pending: rows.filter((r) => r.status === 'REQUESTED').length,
      approved: rows.filter((r) => r.status === 'APPROVED').length,
      today: rows.filter((r) => r.status === 'APPROVED' && visitDateCategory(r.preferredDate) === '오늘').length,
    }),
    [rows]
  );

  const selected = rows.find((r) => r.consultationId === selectedId) ?? null;

  const openDrawer = (row) => {
    setSelectedId(row.consultationId);
    setIsRejecting(false);
    setRejectReason('');
    setActionError(null);
  };

  const closeDrawer = () => {
    setSelectedId(null);
    setIsRejecting(false);
    setRejectReason('');
  };

  const handleApprove = (row) => {
    const confirmed = window.confirm(`${row.expoTitle} / ${row.boothNo} - ${row.customerName}\n${row.typeLabel} 상담 신청을 승인할까요?`);
    if (!confirmed) return;

    setSubmitting(true);
    setActionError(null);
    approveConsultation(row.consultationId)
      .then(() => {
        closeDrawer();
        load();
      })
      .catch((err) => setActionError(err.response?.data?.error?.message ?? '승인 처리 중 오류가 발생했습니다.'))
      .finally(() => setSubmitting(false));
  };

  const handleReject = (row) => {
    if (!rejectReason.trim()) return;
    setSubmitting(true);
    setActionError(null);
    rejectConsultation(row.consultationId, rejectReason.trim())
      .then(() => {
        closeDrawer();
        load();
      })
      .catch((err) => setActionError(err.response?.data?.error?.message ?? '반려 처리 중 오류가 발생했습니다.'))
      .finally(() => setSubmitting(false));
  };

  const handleComplete = (row) => {
    setSubmitting(true);
    setActionError(null);
    completeConsultation(row.consultationId)
      .then(() => {
        closeDrawer();
        load();
      })
      .catch((err) => setActionError(err.response?.data?.error?.message ?? '완료 처리 중 오류가 발생했습니다.'))
      .finally(() => setSubmitting(false));
  };

  const [summaryLoading, setSummaryLoading] = useState(false);

  const handleRegenerateSummary = (row) => {
    setSummaryLoading(true);
    setActionError(null);
    regenerateConsultationAiSummary(row.consultationId)
      .then(load)
      .catch((err) => setActionError(err.response?.data?.error?.message ?? 'AI 요약 생성 중 오류가 발생했습니다.'))
      .finally(() => setSummaryLoading(false));
  };

  const handleNoShow = (row) => {
    const confirmed = window.confirm(`${row.customerName ?? '고객'}님을 미방문으로 처리할까요?`);
    if (!confirmed) return;

    setSubmitting(true);
    setActionError(null);
    markConsultationNoShow(row.consultationId)
      .then(() => {
        closeDrawer();
        load();
      })
      .catch((err) => setActionError(err.response?.data?.error?.message ?? '미방문 처리 중 오류가 발생했습니다.'))
      .finally(() => setSubmitting(false));
  };

  const FILTERS = [
    [filterExpo, setFilterExpo, expoOptions, '전체 박람회'],
    [filterStatus, setFilterStatus, ['전체 상태', '승인 대기', '승인', '반려', '고객 취소', '상담 완료', '미방문']],
    [filterType, setFilterType, ['전체 상담 유형', '구매', '시승', '구매 + 시승']],
    [filterVisitDate, setFilterVisitDate, ['전체 방문일', '오늘', '내일', '이번 주']],
  ];

  return (
    <div>
      <PageHero
        eyebrow="EXHIBITOR MANAGEMENT PORTAL"
        title="상담 관리"
        description="참가한 박람회의 상담 신청을 확인하고 고객 상담 일정을 관리할 수 있습니다."
      />

      <PageContainer className="flex flex-col gap-5">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ['전체 상담 신청', stats.total],
            ['승인 대기', stats.pending],
            ['승인 완료', stats.approved],
            ['오늘 방문 예정', stats.today],
          ].map(([label, value]) => (
            <Card key={label}>
              <CardContent>
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="mt-1 text-3xl font-extrabold">
                  {value}
                  <small className="ml-1 text-sm font-medium text-muted-foreground">건</small>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="flex flex-wrap items-center gap-2">
          {FILTERS.map(([value, setter, options], i) => (
            <Select key={i} value={value} onValueChange={setFilterAndResetPage(setter)}>
              <SelectTrigger className="h-10 w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
          <div className="relative min-w-56 flex-1">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 pl-8"
              placeholder="고객명 / 연락처 / 차량 검색"
              value={search}
              onChange={setFilterAndResetPage(setSearch)}
            />
          </div>
        </section>

        {actionError && <EmptyState tone="error" className="my-0">{actionError}</EmptyState>}
        {loadError && <EmptyState tone="error" className="my-0">{loadError}</EmptyState>}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              상담 신청 <span className="text-primary">{filtered.length}</span>건
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>고객</TableHead>
                  <TableHead>박람회</TableHead>
                  <TableHead>관심 차종</TableHead>
                  <TableHead>상담 유형</TableHead>
                  <TableHead>희망 방문일</TableHead>
                  <TableHead>신청일</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">불러오는 중...</TableCell>
                  </TableRow>
                )}
                {!loading && pageItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      조건에 맞는 상담 신청이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
                {pageItems.map((row) => (
                  <TableRow key={row.consultationId} className="cursor-pointer" onClick={() => openDrawer(row)}>
                    <TableCell>
                      <span className="block font-medium">{row.customerName ?? `고객 #${row.customerId}`}</span>
                      <span className="text-xs text-muted-foreground">{row.customerPhone ?? '-'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="block">{row.expoTitle}</span>
                      <span className="text-xs text-muted-foreground">{row.boothNo}</span>
                    </TableCell>
                    <TableCell>{row.interestedVehicle || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {row.wantsPurchase && <Badge className="bg-blue-100 text-blue-700">구매</Badge>}
                        {row.wantsTestDrive && <Badge className="bg-violet-100 text-violet-700">시승</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <strong className="block">
                        {fmtShortDate(row.preferredDate)} {row.preferredTime?.slice(0, 5)}
                      </strong>
                      <span className="text-xs text-muted-foreground">
                        {WEEKDAYS[new Date(`${row.preferredDate}T00:00:00`).getDay()]}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{fmtDateTime(row.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={STATUS_BADGE[row.status]}>{row.statusLabel}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDrawer(row);
                        }}
                      >
                        상세보기
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={currentPage + 1} totalPages={totalPages} onChange={(p) => setPage(p - 1)} />
          </CardContent>
        </Card>
      </PageContainer>

      <Sheet open={!!selected} onOpenChange={(open) => !open && closeDrawer()}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader className="border-b p-5">
                <SheetTitle className="text-lg">{selected.customerName ?? `고객 #${selected.customerId}`}</SheetTitle>
                <SheetDescription>
                  {selected.customerPhone ?? '-'} · {selected.customerEmail ?? '-'}
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
                {selected.aiSummary && (
                  <Alert>
                    <Sparkles />
                    <AlertTitle>AI 요약</AlertTitle>
                    <AlertDescription>
                      <p className="m-0 whitespace-pre-wrap">{selected.aiSummary}</p>
                    </AlertDescription>
                  </Alert>
                )}

                {!selected.aiSummary && summaryLoading && (
                  <Alert>
                    <Sparkles />
                    <AlertTitle>AI 요약</AlertTitle>
                    <AlertDescription>요약 생성 중...</AlertDescription>
                  </Alert>
                )}

                <DetailSection
                  title="상담 정보"
                  action={
                    !selected.aiSummary && selected.aiSummaryRetryable ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        disabled={summaryLoading}
                        onClick={() => handleRegenerateSummary(selected)}
                      >
                        {summaryLoading ? '생성 중...' : 'AI 요약'}
                      </Button>
                    ) : null
                  }
                  rows={[
                    ['박람회', selected.expoTitle],
                    ['부스', selected.boothNo],
                    ['관심 차종', selected.interestedVehicle || '-'],
                    ['상담 유형', selected.typeLabel],
                    ...(selected.wantsTestDrive ? [['운전면허 소지', selected.hasDriverLicense ? '소지' : '미소지']] : []),
                    [
                      '희망 방문일',
                      `${selected.preferredDate} ${selected.preferredTime?.slice(0, 5)} (${WEEKDAYS[new Date(`${selected.preferredDate}T00:00:00`).getDay()]})`,
                    ],
                  ]}
                />

                <DetailSection
                  title="고객 정보"
                  rows={[
                    ['이름', selected.customerName ?? '-'],
                    ['연락처', selected.customerPhone ?? '-'],
                    ['이메일', selected.customerEmail ?? '-'],
                  ]}
                />

                <div>
                  <h3 className="m-0 mb-2 text-sm font-semibold">추가 문의사항</h3>
                  <p className="m-0 whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm">{selected.message || '-'}</p>
                </div>

                {selected.status === 'REJECTED' && (
                  <div>
                    <h3 className="m-0 mb-2 text-sm font-semibold">반려 사유</h3>
                    <p className="m-0 rounded-lg bg-muted/50 p-3 text-sm">{selected.rejectReason}</p>
                  </div>
                )}
              </div>

              <SheetFooter className="border-t p-5">
                {selected.status === 'APPROVED' ? (
                  isPastVisitDate(selected.preferredDate) ? (
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="flex-1 text-destructive" disabled={submitting} onClick={() => handleNoShow(selected)}>
                        미방문 처리
                      </Button>
                      <Button type="button" className="flex-1" disabled={submitting} onClick={() => handleComplete(selected)}>
                        상담 완료
                      </Button>
                    </div>
                  ) : (
                    <p className="m-0 text-sm text-muted-foreground">
                      방문 예정일({selected.preferredDate}) 다음날부터 완료/미방문 처리할 수 있습니다.
                    </p>
                  )
                ) : selected.status !== 'REQUESTED' ? (
                  <p className="m-0 text-sm text-muted-foreground">이미 처리된 신청입니다.</p>
                ) : isRejecting ? (
                  <div className="flex flex-col gap-2">
                    <Input
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="반려 사유를 입력하세요 (필수)"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setIsRejecting(false)}>
                        취소
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        className="flex-1"
                        disabled={!rejectReason.trim() || submitting}
                        onClick={() => handleReject(selected)}
                      >
                        반려 확정
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="flex-1 text-destructive" disabled={submitting} onClick={() => setIsRejecting(true)}>
                      반려
                    </Button>
                    <Button type="button" className="flex-1" disabled={submitting} onClick={() => handleApprove(selected)}>
                      승인
                    </Button>
                  </div>
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DetailSection({ title, rows, action }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="m-0 text-sm font-semibold">{title}</h3>
        {action}
      </div>
      <dl className="m-0 divide-y rounded-lg border text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 px-3 py-2">
            <dt className="shrink-0 text-muted-foreground">{label}</dt>
            <dd className="m-0 text-right font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default ConsultationRequests;
