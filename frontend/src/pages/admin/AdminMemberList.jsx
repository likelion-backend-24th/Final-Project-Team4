import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminUsers } from '../../api/identity';
import { AdminSidebarLayout } from '@/components/admin/AdminSidebarLayout';
import { EmptyState, PageHeader, Pagination } from '@/components/layout/Page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const ROLE_LABEL = { USER: '일반회원', EXHIBITOR: '참가업체', ADMIN: '관리자' };
const STATUS_LABEL = { ACTIVE: '활성', LOCKED: '정지', WITHDRAWN: '탈퇴' };
const STATUS_TONE = {
  활성: 'bg-emerald-100 text-emerald-700',
  정지: 'bg-red-100 text-red-700',
  탈퇴: 'bg-slate-100 text-slate-600',
};

const ALL = '__all__';
const PAGE_SIZE = 20;

// ISO(2026-01-20T10:14:00) → 2026.01.20
const fmtDate = (iso) => (iso ? iso.slice(0, 10).replace(/-/g, '.') : '-');

function AdminMemberList() {
  const navigate = useNavigate();
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [role, setRole] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [page, setPage] = useState(0);
  const [result, setResult] = useState({ content: [], totalPages: 1, totalElements: 0 });
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    getAdminUsers({
      keyword: keyword || undefined,
      role: role === ALL ? undefined : role,
      status: status === ALL ? undefined : status,
      page,
      size: PAGE_SIZE,
    })
      .then((res) => {
        setResult(res);
        setLoadError(null);
      })
      .catch((err) => setLoadError(err.response?.data?.error?.message ?? '회원 목록을 불러오지 못했습니다.'));
  }, [keyword, role, status, page]);

  const submitSearch = () => {
    setPage(0);
    setKeyword(keywordInput.trim());
  };

  return (
    <AdminSidebarLayout breadcrumb="회원 관리">
      <PageHeader title="회원 관리" description="전체 회원을 검색하고 상세 정보를 확인할 수 있습니다." />

      <div className="flex flex-col gap-5">
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-64 flex-1">
              <Input
                type="text"
                placeholder="이메일, 이름, 회사명 검색"
                className="h-10 rounded-r-none"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
              />
              <Button type="button" className="h-10 rounded-l-none" onClick={submitSearch}>검색</Button>
            </div>
            <Select value={role} onValueChange={(v) => { setRole(v); setPage(0); }}>
              <SelectTrigger className="h-10 w-36"><SelectValue placeholder="전체 역할" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>전체 역할</SelectItem>
                <SelectItem value="USER">일반회원</SelectItem>
                <SelectItem value="EXHIBITOR">참가업체</SelectItem>
                <SelectItem value="ADMIN">관리자</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
              <SelectTrigger className="h-10 w-32"><SelectValue placeholder="전체 상태" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>전체 상태</SelectItem>
                <SelectItem value="ACTIVE">활성</SelectItem>
                <SelectItem value="LOCKED">정지</SelectItem>
                <SelectItem value="WITHDRAWN">탈퇴</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {loadError && <EmptyState tone="error" className="my-0">{loadError}</EmptyState>}

        <Card className="py-0">
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">이메일</TableHead>
                  <TableHead>이름 / 회사명</TableHead>
                  <TableHead>역할</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="pr-5">가입일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.content.length === 0 && !loadError && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      조건에 맞는 회원이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
                {result.content.map((user) => {
                  const statusLabel = STATUS_LABEL[user.status] ?? user.status;
                  return (
                    <TableRow
                      key={user.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/admin/members/${user.id}`)}
                    >
                      <TableCell className="pl-5">{user.email}</TableCell>
                      <TableCell>{user.name ?? user.companyName ?? '-'}</TableCell>
                      <TableCell>{ROLE_LABEL[user.role] ?? user.role}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={STATUS_TONE[statusLabel]}>{statusLabel}</Badge>
                      </TableCell>
                      <TableCell className="pr-5">{fmtDate(user.createdAt)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Pagination page={page + 1} totalPages={result.totalPages} onChange={(p) => setPage(p - 1)} />
      </div>
    </AdminSidebarLayout>
  );
}

export default AdminMemberList;
