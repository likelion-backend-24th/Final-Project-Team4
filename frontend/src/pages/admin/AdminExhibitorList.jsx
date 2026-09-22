import { Building2, CircleCheck, Download, ShieldCheck, UserX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAdminExhibitorStats } from '@/api/identity';
import { AdminSidebarLayout } from '@/components/admin/AdminSidebarLayout';
import { StatCard } from '@/components/admin/StatCard';
import { EmptyState, PageHeader, Pagination } from '@/components/layout/Page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAdminMemberList } from '@/hooks/admin/useAdminMemberList';
import { useAdminMemberStats } from '@/hooks/admin/useAdminMemberStats';
import { ALL, PAGE_SIZE_OPTIONS, PERIOD_OPTIONS, STATUS_LABEL, STATUS_TONE, fmtDate, percent } from '@/utils/adminMemberList';

function AdminExhibitorList() {
  const navigate = useNavigate();
  const stats = useAdminMemberStats(getAdminExhibitorStats);
  const {
    keywordInput, setKeywordInput,
    status, setStatus,
    period, setPeriod,
    page, setPage,
    pageSize, setPageSize,
    result, loadError, exporting,
    submitSearch, handleExport,
    from, to,
  } = useAdminMemberList({ role: 'EXHIBITOR', filenamePrefix: 'exhibitors', notFoundMessage: '참가업체 목록을 불러오지 못했습니다.' });

  return (
    <AdminSidebarLayout breadcrumb="회원 관리 / 참가업체 관리">
      <PageHeader title="참가업체 관리" description="박람회에 참가하는 참가업체 회원을 관리할 수 있습니다." />

      <div className="flex flex-col gap-5">
        {stats && (
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={Building2}
              tone="bg-blue-100 text-blue-600"
              label="전체 업체"
              value={`${stats.totalCount.toLocaleString()}개`}
            />
            <StatCard
              icon={ShieldCheck}
              tone="bg-emerald-100 text-emerald-600"
              label="활성 업체"
              value={`${stats.activeCount.toLocaleString()}개`}
              sub={percent(stats.activeCount, stats.totalCount)}
            />
            <StatCard
              icon={CircleCheck}
              tone="bg-amber-100 text-amber-600"
              label="참가중 업체"
              value={`${stats.participatingCount.toLocaleString()}개`}
              sub={percent(stats.participatingCount, stats.activeCount)}
            />
            <StatCard
              icon={UserX}
              tone="bg-red-100 text-red-600"
              label="미참가 업체"
              value={`${stats.notParticipatingCount.toLocaleString()}개`}
              sub={percent(stats.notParticipatingCount, stats.activeCount)}
            />
          </section>
        )}

        <Card>
          <CardContent className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-64 flex-1">
              <Input
                type="text"
                placeholder="회사명, 담당자명, 이메일, 연락처로 검색하세요."
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
                  <TableHead>회사명</TableHead>
                  <TableHead>사업자번호</TableHead>
                  <TableHead>담당자명</TableHead>
                  <TableHead>연락처</TableHead>
                  <TableHead>참가 신청 건수</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>가입일</TableHead>
                  <TableHead className="pr-5 text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.content.length === 0 && !loadError && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                      조건에 맞는 참가업체가 없습니다.
                    </TableCell>
                  </TableRow>
                )}
                {result.content.map((user, i) => {
                  const accountStatusLabel = STATUS_LABEL[user.status] ?? user.status;
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="pl-5 text-muted-foreground">{page * pageSize + i + 1}</TableCell>
                      <TableCell className="font-medium">{user.companyName ?? '-'}</TableCell>
                      <TableCell>{user.businessNo ?? '-'}</TableCell>
                      <TableCell>{user.managerName ?? '-'}</TableCell>
                      <TableCell>{user.contact ?? '-'}</TableCell>
                      <TableCell>{(user.applicationCount ?? 0).toLocaleString()}건</TableCell>
                      <TableCell>
                        {accountStatusLabel !== '활성' ? (
                          <Badge variant="secondary" className={STATUS_TONE[accountStatusLabel]}>{accountStatusLabel}</Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className={user.participating ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}
                          >
                            {user.participating ? '참가중' : '미참가'}
                          </Badge>
                        )}
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
            총 {result.totalElements.toLocaleString()}개 중 {from}-{to}개를 표시합니다.
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

export default AdminExhibitorList;
