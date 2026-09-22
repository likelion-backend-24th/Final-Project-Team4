import { Download, UserCheck, UserMinus, UserPlus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { exportAdminUsers, getAdminUserStats, getAdminUsers } from '../../api/identity';
import { AdminSidebarLayout } from '@/components/admin/AdminSidebarLayout';
import { EmptyState, PageHeader, Pagination } from '@/components/layout/Page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

const STATUS_LABEL = { ACTIVE: '활성', LOCKED: '정지', WITHDRAWN: '탈퇴' };
const STATUS_TONE = {
  활성: 'bg-emerald-100 text-emerald-700',
  정지: 'bg-red-100 text-red-700',
  탈퇴: 'bg-slate-100 text-slate-600',
};

const ALL = '__all__';
const PERIOD_OPTIONS = [
  { value: ALL, label: '전체 기간' },
  { value: '0', label: '오늘 가입' },
  { value: '7', label: '최근 7일' },
  { value: '30', label: '최근 30일' },
];
const PAGE_SIZE_OPTIONS = [10, 20, 50];

// ISO(2026-01-20T10:14:00) → 2026.01.20
const fmtDate = (iso) => (iso ? iso.slice(0, 10).replace(/-/g, '.') : '-');
// ISO → 2026.01.20 10:14
const fmtDateTime = (iso) => (iso ? iso.slice(0, 16).replace('T', ' ').replace(/-/g, '.') : '-');

const toDateParam = (date) => date.toISOString().slice(0, 10);

// "최근 N일" 선택값 → 백엔드 signupFrom/signupTo(둘 다 date, 자정 기준) 변환. 전체 기간이면 undefined.
function periodToRange(period) {
  if (period === ALL) return { signupFrom: undefined, signupTo: undefined };
  const days = Number(period);
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - days);
  return { signupFrom: toDateParam(from), signupTo: toDateParam(today) };
}

function percent(count, total) {
  if (!total) return '0%';
  return `${((count / total) * 100).toFixed(1)}%`;
}

function StatCard({ icon: Icon, tone, label, value, sub }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', tone)}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="m-0 text-xs text-muted-foreground">{label}</p>
          <strong className="mt-0.5 block text-2xl font-extrabold">{value}</strong>
          {sub && <p className="m-0 mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function AdminAttendeeList() {
  const navigate = useNavigate();
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState(ALL);
  const [period, setPeriod] = useState(ALL);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [result, setResult] = useState({ content: [], totalPages: 1, totalElements: 0 });
  const [stats, setStats] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [exporting, setExporting] = useState(false);

  // 통계 카드는 검색/필터와 무관하게 참관객 전체 기준 - 목록 필터가 바뀌어도 다시 불러오지 않는다.
  useEffect(() => {
    getAdminUserStats('USER')
      .then(setStats)
      .catch(() => {}); // 통계 조회 실패는 카드만 숨기고 목록 조회는 그대로 진행
  }, []);

  useEffect(() => {
    const { signupFrom, signupTo } = periodToRange(period);
    getAdminUsers({
      role: 'USER',
      keyword: keyword || undefined,
      status: status === ALL ? undefined : status,
      signupFrom,
      signupTo,
      page,
      size: pageSize,
    })
      .then((res) => {
        setResult(res);
        setLoadError(null);
      })
      .catch((err) => setLoadError(err.response?.data?.error?.message ?? '참관객 목록을 불러오지 못했습니다.'));
  }, [keyword, status, period, page, pageSize]);

  const submitSearch = () => {
    setPage(0);
    setKeyword(keywordInput.trim());
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { signupFrom, signupTo } = periodToRange(period);
      const { blob, headers } = await exportAdminUsers({
        role: 'USER',
        keyword: keyword || undefined,
        status: status === ALL ? undefined : status,
        signupFrom,
        signupTo,
      });

      const disposition = headers?.['content-disposition'] ?? '';
      const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
      const filename = match ? decodeURIComponent(match[1]) : `attendees_${toDateParam(new Date())}.csv`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.error?.message ?? '엑셀 다운로드에 실패했습니다.');
    } finally {
      setExporting(false);
    }
  };

  const from = result.totalElements === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(page * pageSize + result.content.length, result.totalElements);

  return (
    <AdminSidebarLayout breadcrumb="회원 관리 / 참관객 관리">
      <PageHeader title="참관객 관리" description="박람회를 방문하는 참관객 회원을 관리할 수 있습니다." />

      <div className="flex flex-col gap-5">
        {stats && (
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={Users}
              tone="bg-blue-100 text-blue-600"
              label="전체 참관객"
              value={`${stats.totalCount.toLocaleString()}명`}
            />
            <StatCard
              icon={UserCheck}
              tone="bg-emerald-100 text-emerald-600"
              label="활성 회원"
              value={`${stats.activeCount.toLocaleString()}명`}
              sub={percent(stats.activeCount, stats.totalCount)}
            />
            <StatCard
              icon={UserPlus}
              tone="bg-amber-100 text-amber-600"
              label="오늘 가입"
              value={`${stats.todaySignupCount.toLocaleString()}명`}
            />
            <StatCard
              icon={UserMinus}
              tone="bg-red-100 text-red-600"
              label="탈퇴 회원"
              value={`${stats.withdrawnCount.toLocaleString()}명`}
              sub={percent(stats.withdrawnCount, stats.totalCount)}
            />
          </section>
        )}

        <Card>
          <CardContent className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-64 flex-1">
              <Input
                type="text"
                placeholder="이메일, 이름, 연락처로 검색하세요."
                className="h-10 rounded-r-none"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
              />
              <Button type="button" className="h-10 rounded-l-none" onClick={submitSearch}>검색</Button>
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
              <SelectTrigger className="h-10 w-32"><SelectValue placeholder="전체 상태" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>전체 상태</SelectItem>
                <SelectItem value="ACTIVE">활성</SelectItem>
                <SelectItem value="LOCKED">정지</SelectItem>
                <SelectItem value="WITHDRAWN">탈퇴</SelectItem>
              </SelectContent>
            </Select>
            <Select value={period} onValueChange={(v) => { setPeriod(v); setPage(0); }}>
              <SelectTrigger className="h-10 w-32"><SelectValue placeholder="전체 기간" /></SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" className="h-10" onClick={handleExport} disabled={exporting}>
              <Download /> {exporting ? '다운로드 중...' : '엑셀 다운로드'}
            </Button>
          </CardContent>
        </Card>

        {loadError && <EmptyState tone="error" className="my-0">{loadError}</EmptyState>}

        <Card className="py-0">
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14 pl-5">No</TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>연락처</TableHead>
                  <TableHead>체크인 여부</TableHead>
                  <TableHead>최종 입장일</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>가입일</TableHead>
                  <TableHead className="pr-5 text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.content.length === 0 && !loadError && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                      조건에 맞는 참관객이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
                {result.content.map((user, i) => {
                  const statusLabel = STATUS_LABEL[user.status] ?? user.status;
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="pl-5 text-muted-foreground">{page * pageSize + i + 1}</TableCell>
                      <TableCell className="font-medium">{user.name ?? '-'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.contact ?? '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={user.checkedIn ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}
                        >
                          {user.checkedIn ? '체크인' : '미체크인'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{fmtDateTime(user.lastCheckedInAt)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={STATUS_TONE[statusLabel]}>{statusLabel}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{fmtDate(user.createdAt)}</TableCell>
                      <TableCell className="pr-5 text-right">
                        <Button type="button" variant="ghost" size="sm" onClick={() => navigate(`/admin/members/${user.id}`)}>
                          상세보기
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 text-sm text-muted-foreground">
            총 {result.totalElements.toLocaleString()}명 중 {from}-{to}명을 표시합니다.
          </p>
          <div className="flex items-center gap-3">
            <Pagination page={page + 1} totalPages={result.totalPages} onChange={(p) => setPage(p - 1)} className="mt-0" />
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}>
              <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}개씩 보기</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </AdminSidebarLayout>
  );
}

export default AdminAttendeeList;