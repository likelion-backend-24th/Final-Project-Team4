import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  approveBoothApplication,
  getAdminBoothApplications,
  getAdminExpoBooths,
  rejectBoothApplication,
} from '../../api/expo';
import HallMap, { HallPlaza } from '../../components/HallMap';
import { getBoothHall } from '../../utils/boothType';
import { AdminSidebarLayout } from '@/components/admin/AdminSidebarLayout';
import { EmptyState, PageHeader } from '@/components/layout/Page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const STATUS_LABEL = {
  DRAFT: '임시저장',
  SUBMITTED: '심사중',
  PAYMENT_PENDING: '결제대기',
  CONFIRMED: '참가 확정',
  REJECTED: '반려',
  REFUND_REQUIRED: '환불 대기',
  CANCELLED: '취소됨',
};

const STATUS_TONE = {
  심사중: 'bg-amber-100 text-amber-700',
  결제대기: 'bg-blue-100 text-blue-700',
  '참가 확정': 'bg-emerald-100 text-emerald-700',
  반려: 'bg-red-100 text-red-700',
  취소됨: 'bg-slate-100 text-slate-600',
};

function StatusBadge({ label }) {
  return (
    <Badge variant="secondary" className={STATUS_TONE[label]}>
      {label}
    </Badge>
  );
}

// 심사 대기(SUBMITTED) 부스가 신청일로부터 며칠째 방치되고 있는지 계산 - 관리자가 놓치지 않도록 경고 배지로 보여줌
const daysWaiting = (submittedAt) => {
  if (!submittedAt) return 0;
  return Math.floor((Date.now() - new Date(submittedAt).getTime()) / (1000 * 60 * 60 * 24));
};

const FILTER_TABS = ['전체', '심사중', '결제대기', '반려'];

// ISO(2026-01-20T10:14:00) → 2026.01.20 10:14
const fmtDateTime = (iso) => (iso ? iso.slice(0, 16).replace('T', ' ').replace(/-/g, '.') : '-');

// "부스별 심사 현황" — 그룹 안의 부스 목록(또는 부스별 보기의 경쟁 업체 목록)에서 상태 무관하게 라디오로 선택해 상세를 확인.
// 승인/반려 액션은 심사중 건에만 가능하지만, 선택 자체는 모든 상태에서 가능해야 지난 심사 결과도 확인할 수 있다.
function BoothSelectList({ applicants, renderLabel, selectedApplicationId, onSelect }) {
  return (
    <RadioGroup
      value={selectedApplicationId != null ? String(selectedApplicationId) : ''}
      onValueChange={(v) => onSelect(Number(v))}
      className="gap-2"
    >
      {applicants.map((app) => {
        const isSelected = selectedApplicationId === app.applicationId;
        return (
          <label
            key={app.applicationId}
            htmlFor={`sel-${app.applicationId}`}
            className={cn(
              'flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition-colors',
              isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
            )}
          >
            <span className="flex items-center gap-3 text-sm">
              <RadioGroupItem id={`sel-${app.applicationId}`} value={String(app.applicationId)} />
              <strong className="flex-1">{renderLabel(app)}</strong>
              <StatusBadge label={app.statusLabel} />
            </span>
            {app.rejectReason && <span className="pl-7 text-xs text-destructive">사유: {app.rejectReason}</span>}
          </label>
        );
      })}
    </RadioGroup>
  );
}

function InfoGrid({ title, rows }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="m-0 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="m-0 mt-0.5 font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

// 좌측 컬럼: "신청 업체 대표 정보" + "부스 참가 상세 신청 정보".
// selectedApp이 없으면(아직 심사 대상을 선택 안 했으면) 안내 문구만 보여준다.
function ApplicantInfoColumn({ selectedApp }) {
  if (!selectedApp) {
    return <p className="m-0 text-sm text-muted-foreground">오른쪽에서 심사할 부스를 선택하면 상세 정보가 표시됩니다.</p>;
  }

  const group = selectedApp.group;

  return (
    <>
      <InfoGrid
        title="신청 업체 대표 정보"
        rows={[
          ['업체명', group?.companyName ?? '-'],
          ['사업자등록번호', group?.businessNumber ?? '-'],
          ['대표자명', group?.ceoName ?? '-'],
          ['담당자 이메일', group?.managerEmail ?? '-'],
        ]}
      />
      <InfoGrid
        title="부스 참가 상세 신청 정보"
        rows={[
          ['희망 부스 번호', selectedApp.boothNo],
          ['부스 유형 및 규격', selectedApp.boothType ?? '-'],
          ['주요 전시 품목', group?.exhibitionItem],
          ['전시 컨셉 설명', group?.conceptDescription],
          ['추가 요청 사항', group?.additionalRequest || '-'],
        ]}
      />
    </>
  );
}

// 우측 컬럼 하단: 선택된 신청 건의 상태·메모·승인/반려 액션 카드 ("참가 신청 심사").
function ReviewCard({ selectedApp, memo, setMemo, onApprove, onReject, isSubmitting, actionError }) {
  if (!selectedApp) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">참가 신청 심사</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="m-0 text-sm text-muted-foreground">위 목록에서 심사할 부스를 선택하세요.</p>
        </CardContent>
      </Card>
    );
  }

  const isPending = selectedApp.statusLabel === '심사중';
  const statusBadgeLabel = isPending ? '심사중 (대기)' : selectedApp.statusLabel;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">참가 신청 심사</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="m-0 divide-y rounded-lg border text-sm">
          {[
            ['신청 접수 상태', <StatusBadge key="s" label={selectedApp.statusLabel}>{statusBadgeLabel}</StatusBadge>],
            ['최초 신청 일시', fmtDateTime(selectedApp.submittedAt)],
            ['심사 처리 일시', '-'],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between px-3 py-2">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="m-0 font-medium">{label === '신청 접수 상태' ? <StatusBadge label={selectedApp.statusLabel} /> : value}</dd>
            </div>
          ))}
        </dl>

        {isPending ? (
          <>
            <div className="grid gap-1.5">
              <label htmlFor="review-memo" className="text-sm font-medium">관리자 심사 메모</label>
              <Textarea
                id="review-memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder='예: "해당 부스 배정 승인 전, 전력 추가 용량(3kW) 공급 가능 여부 전시 기술팀 협의 필요."'
                rows={4}
              />
              <p className="m-0 text-xs text-muted-foreground">* 반려 시 참가업체에 이메일로 반려 사유가 즉시 안내됩니다.</p>
            </div>
            {actionError && <p className="m-0 text-sm text-destructive">{actionError}</p>}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 text-destructive"
                disabled={!memo.trim() || isSubmitting}
                title={!memo.trim() ? '반려 사유를 입력하세요' : undefined}
                onClick={() => onReject(selectedApp, memo)}
              >
                신청 반려
              </Button>
              <Button type="button" className="flex-1" disabled={isSubmitting} onClick={() => onApprove(selectedApp)}>
                신청 승인 완료
              </Button>
            </div>
          </>
        ) : (
          <p className="m-0 text-sm text-muted-foreground">이미 처리된 신청 건입니다. (승인/반려 대상 아님)</p>
        )}
      </CardContent>
    </Card>
  );
}

// 펼침 영역: 좌(신청 정보) / 우(부스 선택 + 심사) 2열
function ReviewPanel({ children, selectorTitle, selector, review }) {
  return (
    <div className="grid gap-4 bg-muted/30 p-4 lg:grid-cols-2">
      <div className="flex flex-col gap-4">{children}</div>
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{selectorTitle}</CardTitle>
          </CardHeader>
          <CardContent>{selector}</CardContent>
        </Card>
        {review}
      </div>
    </div>
  );
}

function ToggleButton({ open, onClick }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick}>
      {open ? (
        <>
          접기 <ChevronUp />
        </>
      ) : (
        <>
          펼치기 <ChevronDown />
        </>
      )}
    </Button>
  );
}

function AdminExpoDetail() {
  const { expoId } = useParams();
  const navigate = useNavigate();

  const [expoBooths, setExpoBooths] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [openBoothKey, setOpenBoothKey] = useState(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState(null);
  const [memo, setMemo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);

  const selectDefault = (applications) => {
    const firstPending = applications.find((a) => a.statusLabel === '심사중');
    setSelectedApplicationId((firstPending ?? applications[0])?.applicationId ?? null);
  };

  const toggleGroup = (group) => {
    const isOpen = openId === group.groupId;
    setOpenId(isOpen ? null : group.groupId);
    setMemo('');
    setActionError(null);
    // 펼칠 때 심사 대기중인 부스를 기본 선택, 없으면 첫 부스
    if (!isOpen) {
      selectDefault(group.applications);
    } else {
      setSelectedApplicationId(null);
    }
  };

  const toggleBoothRow = (row) => {
    const isOpen = openBoothKey === row.key;
    setOpenBoothKey(isOpen ? null : row.key);
    setMemo('');
    setActionError(null);
    if (!isOpen) {
      selectDefault(row.applicants);
    } else {
      setSelectedApplicationId(null);
    }
  };
  const [filter, setFilter] = useState('전체');
  const [view, setView] = useState('booth'); // 'group' | 'booth'

  const loadApplications = () => {
    getAdminBoothApplications({ size: 200 })
      .then((res) => {
        const scoped = res.content
          .filter((g) => String(g.expoId) === expoId)
          .map((group) => ({
            ...group,
            applications: group.applications.map((app) => ({
              ...app,
              statusLabel: STATUS_LABEL[app.status] ?? app.status,
            })),
          }));
        setGroups(scoped);
      })
      .catch((err) => setLoadError(err.response?.data?.error?.message ?? '신청 목록을 불러오지 못했습니다.'));
  };

  const loadBooths = () => {
    getAdminExpoBooths(expoId)
      .then(setExpoBooths)
      .catch((err) => setLoadError(err.response?.data?.error?.message ?? '부스 배치 정보를 불러오지 못했습니다.'));
  };

  useEffect(() => {
    loadBooths();
    loadApplications();
  }, [expoId]);

  const handleApprove = (app) => {
    if (!app) return;
    setIsSubmitting(true);
    setActionError(null);
    approveBoothApplication(app.applicationId)
      .then(() => {
        setMemo('');
        loadApplications();
        loadBooths();
      })
      .catch((err) => setActionError(err.response?.data?.error?.message ?? '승인 처리 중 오류가 발생했습니다.'))
      .finally(() => setIsSubmitting(false));
  };

  const handleReject = (app, reason) => {
    if (!app || !reason.trim()) return;
    setIsSubmitting(true);
    setActionError(null);
    rejectBoothApplication(app.applicationId, reason.trim())
      .then(() => {
        setMemo('');
        loadApplications();
      })
      .catch((err) => setActionError(err.response?.data?.error?.message ?? '반려 처리 중 오류가 발생했습니다.'))
      .finally(() => setIsSubmitting(false));
  };

  const allApplications = useMemo(
    () => groups.flatMap((g) => g.applications.map((app) => ({ ...app, group: g }))),
    [groups]
  );

  const pendingCountByBooth = useMemo(() => {
    const map = new Map();
    allApplications
      .filter((a) => a.statusLabel === '심사중')
      .forEach((a) => map.set(a.boothNo, (map.get(a.boothNo) ?? 0) + 1));
    return map;
  }, [allApplications]);

const mapBooths = useMemo(
    () =>
      (expoBooths?.booths ?? []).map((b) => {
        const pendingCount = pendingCountByBooth.get(b.boothNo) ?? 0;
        if (b.status !== 'AVAILABLE' || pendingCount === 0) return b;
        return { ...b, status: pendingCount > 1 ? 'PENDING_CONFLICT' : 'PENDING_REVIEW' };
      }),
    [expoBooths, pendingCountByBooth]
  );

  const stats = {
    total: allApplications.length,
    pending: allApplications.filter((a) => a.statusLabel === '심사중').length,
    approved: allApplications.filter((a) => a.statusLabel === '참가 확정').length,
    rejected: allApplications.filter((a) => a.statusLabel === '반려').length,
  };

  const filteredGroups = useMemo(() => {
    if (filter === '전체') return groups;
    return groups
      .map((g) => ({ ...g, applications: g.applications.filter((a) => a.statusLabel === filter) }))
      .filter((g) => g.applications.length > 0);
  }, [groups, filter]);

  const boothRows = useMemo(() => {
    const map = new Map();
    for (const app of allApplications) {
      if (filter !== '전체' && app.statusLabel !== filter) continue;
      if (!map.has(app.boothNo)) {
        map.set(app.boothNo, { key: app.boothNo, boothNo: app.boothNo, applicants: [] });
      }
      map.get(app.boothNo).applicants.push(app);
    }
    return Array.from(map.values()).sort((a, b) => b.applicants.length - a.applicants.length);
  }, [allApplications, filter]);

  const LEGEND = [
    ['border-blue-100 bg-blue-50', '미배정'],
    ['border-yellow-300 bg-yellow-100', '심사중'],
    ['border-red-600 bg-yellow-100', '심사중(중복)'],
    ['border-slate-200 bg-slate-100', '결제대기'],
    ['border-slate-900 bg-slate-900', '참가확정'],
  ];

  return (
    <AdminSidebarLayout breadcrumb={expoBooths ? `참가 신청 관리 / ${expoBooths.title}` : '참가 신청 관리'}>
      <Button type="button" variant="ghost" size="sm" className="mb-2 -ml-2" onClick={() => navigate('/admin/applications')}>
        <ArrowLeft /> 박람회 목록
      </Button>
      <PageHeader
        title={expoBooths ? expoBooths.title : '박람회 참가 신청 관리'}
        description="실시간 부스 배치 현황과 참가 신청 내역을 확인하고 심사합니다."
      />

      <div className="flex flex-col gap-6">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ['전체 신청 건수', stats.total, ''],
            ['심사 대기 건수', stats.pending, 'text-amber-600'],
            ['최종 승인 완료', stats.approved, 'text-emerald-600'],
            ['신청 반려 내역', stats.rejected, 'text-red-600'],
          ].map(([label, value, tone]) => (
            <Card key={label}>
              <CardContent>
                <p className="m-0 text-xs text-muted-foreground">{label}</p>
                <strong className={cn('mt-1 block text-3xl font-extrabold', tone)}>{value}건</strong>
              </CardContent>
            </Card>
          ))}
        </section>

        {loadError && <EmptyState tone="error" className="my-0">{loadError}</EmptyState>}

        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-lg">실시간 부스 배치 현황</CardTitle>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {LEGEND.map(([cls, label]) => (
                <span key={label} className="flex items-center gap-1.5">
                  <i className={cn('inline-block size-3 rounded-sm border', cls)} /> {label}
                </span>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {expoBooths ? (
              <div className="flex gap-4 overflow-x-auto pb-2">
                {[...new Set(mapBooths.map((b) => getBoothHall(b.boothNo)))]
                  .sort()
                  .map((h, i) => (
                    <Fragment key={h}>
                      {i > 0 && <HallPlaza />}
                      <HallMap
                        hallName={h}
                        booths={mapBooths.filter((b) => getBoothHall(b.boothNo) === h)}
                        selectedBoothIds={[]}
                        onSelect={() => {}}
                        reverseFood={i % 2 === 1}
                        showStatusLabel
                      />
                    </Fragment>
                  ))}
              </div>
            ) : (
              !loadError && <EmptyState>불러오는 중...</EmptyState>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              {FILTER_TABS.map((t) => (
                <TabsTrigger key={t} value={t}>
                  {t}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Tabs value={view} onValueChange={setView}>
            <TabsList>
              <TabsTrigger value="group">그룹별 보기</TabsTrigger>
              <TabsTrigger value="booth">부스별 보기 (경쟁 확인)</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Card className="py-0">
          <CardContent className="overflow-x-auto p-0">
            {view === 'group' ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">참가업체 ID</TableHead>
                    <TableHead>신청 부스</TableHead>
                    <TableHead>신청일</TableHead>
                    <TableHead className="pr-5 text-right">동작</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGroups.length === 0 && !loadError && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">신청 내역이 없습니다.</TableCell>
                    </TableRow>
                  )}
                  {filteredGroups.map((group) => {
                    const isOpen = openId === group.groupId;
                    const applicants = group.applications.map((app) => ({ ...app, group }));
                    const selectedApp = applicants.find((a) => a.applicationId === selectedApplicationId);
                    return (
                      <Fragment key={group.groupId}>
                        <TableRow className={isOpen ? 'bg-muted/40' : ''}>
                          <TableCell className="pl-5 font-semibold">#{group.exhibitorId}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              {group.applications.map((app) => {
                                const waitingDays = app.status === 'SUBMITTED' ? daysWaiting(app.submittedAt) : 0;
                                return (
                                  <span key={app.applicationId} className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs">
                                    {app.boothNo}
                                    <StatusBadge label={app.statusLabel} />
                                    {waitingDays >= 3 && (
                                      <Badge variant="secondary" className="bg-red-100 text-red-700">{waitingDays}일째 대기</Badge>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          </TableCell>
                          <TableCell>{group.createdAt.slice(0, 10)}</TableCell>
                          <TableCell className="pr-5 text-right">
                            <ToggleButton open={isOpen} onClick={() => toggleGroup(group)} />
                          </TableCell>
                        </TableRow>
                        {isOpen && (
                          <TableRow>
                            <TableCell colSpan={4} className="p-0">
                              <ReviewPanel
                                selectorTitle="부스별 심사 현황 (부스를 선택해 개별 승인/반려)"
                                selector={
                                  <BoothSelectList
                                    applicants={applicants}
                                    renderLabel={(app) => app.boothNo}
                                    selectedApplicationId={selectedApplicationId}
                                    onSelect={setSelectedApplicationId}
                                  />
                                }
                                review={
                                  <ReviewCard
                                    selectedApp={selectedApp}
                                    memo={memo}
                                    setMemo={setMemo}
                                    onApprove={handleApprove}
                                    onReject={handleReject}
                                    isSubmitting={isSubmitting}
                                    actionError={actionError}
                                  />
                                }
                              >
                                <ApplicantInfoColumn selectedApp={selectedApp} />
                              </ReviewPanel>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">부스번호</TableHead>
                    <TableHead>경쟁 신청</TableHead>
                    <TableHead>신청 업체 / 상태</TableHead>
                    <TableHead className="pr-5 text-right">동작</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {boothRows.length === 0 && !loadError && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">신청 내역이 없습니다.</TableCell>
                    </TableRow>
                  )}
                  {boothRows.map((row) => {
                    const isOpen = openBoothKey === row.key;
                    const selectedApp = row.applicants.find((a) => a.applicationId === selectedApplicationId);
                    return (
                      <Fragment key={row.key}>
                        <TableRow className={cn(row.applicants.length > 1 && 'bg-amber-50/60', isOpen && 'bg-muted/40')}>
                          <TableCell className="pl-5 font-semibold">{row.boothNo}</TableCell>
                          <TableCell>
                            {row.applicants.length > 1 ? (
                              <Badge variant="secondary" className="bg-amber-100 text-amber-700">경쟁 {row.applicants.length}건</Badge>
                            ) : (
                              <span className="text-muted-foreground">단독 신청</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              {row.applicants.map((app) => (
                                <span key={app.applicationId} className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs">
                                  #{app.group.exhibitorId}
                                  <StatusBadge label={app.statusLabel} />
                                </span>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="pr-5 text-right">
                            <ToggleButton open={isOpen} onClick={() => toggleBoothRow(row)} />
                          </TableCell>
                        </TableRow>
                        {isOpen && (
                          <TableRow>
                            <TableCell colSpan={4} className="p-0">
                              <ReviewPanel
                                selectorTitle={`${row.boothNo} 신청 업체 비교 (업체를 선택해 개별 승인/반려)`}
                                selector={
                                  <BoothSelectList
                                    applicants={row.applicants}
                                    renderLabel={(app) => `#${app.group.exhibitorId}`}
                                    selectedApplicationId={selectedApplicationId}
                                    onSelect={setSelectedApplicationId}
                                  />
                                }
                                review={
                                  <ReviewCard
                                    selectedApp={selectedApp}
                                    memo={memo}
                                    setMemo={setMemo}
                                    onApprove={handleApprove}
                                    onReject={handleReject}
                                    isSubmitting={isSubmitting}
                                    actionError={actionError}
                                  />
                                }
                              >
                                <ApplicantInfoColumn selectedApp={selectedApp} />
                              </ReviewPanel>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminSidebarLayout>
  );
}

export default AdminExpoDetail;
