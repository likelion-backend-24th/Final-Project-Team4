import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAdminUserDetail, updateAdminUserStatus } from '@/api/identity';
import { AdminSidebarLayout } from '@/components/admin/AdminSidebarLayout';
import { EmptyState, PageHeader } from '@/components/layout/Page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ROLE_LABEL = { USER: '일반회원', EXHIBITOR: '참가업체', ADMIN: '관리자' };
const STATUS_LABEL = { ACTIVE: '활성', LOCKED: '정지', WITHDRAWN: '탈퇴' };
const STATUS_TONE = {
  활성: 'bg-emerald-100 text-emerald-700',
  정지: 'bg-red-100 text-red-700',
  탈퇴: 'bg-slate-100 text-slate-600',
};
const PROVIDER_LABEL = { GOOGLE: '구글', KAKAO: '카카오', NAVER: '네이버' };

// ISO(2026-01-20T10:14:00) → 2026.01.20 10:14
const fmtDateTime = (iso) => (iso ? iso.slice(0, 16).replace('T', ' ').replace(/-/g, '.') : '-');

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

function AdminMemberDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    getAdminUserDetail(userId)
      .then(setUser)
      .catch((err) => setLoadError(err.response?.data?.error?.message ?? '회원 정보를 불러오지 못했습니다.'));
  }, [userId]);

  const statusLabel = user && (STATUS_LABEL[user.status] ?? user.status);

  const handleLock = async () => {
    if (!window.confirm('이 회원 계정을 정지할까요? 정지된 계정은 로그인할 수 없습니다.')) return;
    try {
      const updated = await updateAdminUserStatus(userId, 'LOCKED');
      setUser(updated);
    } catch (err) {
      alert(err.response?.data?.error?.message ?? '계정 정지에 실패했습니다.');
    }
  };

  const handleActivate = async () => {
    if (!window.confirm('이 회원 계정의 정지를 해제할까요?')) return;
    try {
      const updated = await updateAdminUserStatus(userId, 'ACTIVE');
      setUser(updated);
    } catch (err) {
      alert(err.response?.data?.error?.message ?? '정지 해제에 실패했습니다.');
    }
  };

  return (
    <AdminSidebarLayout breadcrumb={user ? `회원 관리 / ${user.email}` : '회원 관리 / 회원 상세'}>
      <Button type="button" variant="ghost" size="sm" className="mb-2 -ml-2" onClick={() => navigate('/admin/members')}>
        <ArrowLeft /> 회원 목록
      </Button>
      <PageHeader title="회원 상세" />

      <div className="flex flex-col gap-5">
        {loadError && <EmptyState tone="error" className="my-0">{loadError}</EmptyState>}

        {user && (
          <>
            <InfoGrid
              title="기본 정보"
              rows={[
                ['이메일', user.email],
                ['역할', ROLE_LABEL[user.role] ?? user.role],
                ['상태', <Badge key="status" variant="secondary" className={STATUS_TONE[statusLabel]}>{statusLabel}</Badge>],
                ['로그인 방식', user.provider ? `소셜(${PROVIDER_LABEL[user.provider] ?? user.provider})` : '이메일'],
                ['가입일', fmtDateTime(user.createdAt)],
                ['최근 수정일', fmtDateTime(user.updatedAt)],
              ]}
            />

            {user.role !== 'ADMIN' && user.status !== 'WITHDRAWN' && (
              <div className="flex justify-end">
                {user.status === 'LOCKED' ? (
                  <Button type="button" variant="outline" onClick={handleActivate}>정지 해제</Button>
                ) : (
                  <Button type="button" variant="destructive" onClick={handleLock}>계정 정지</Button>
                )}
              </div>
            )}

            {user.role === 'EXHIBITOR' ? (
              <InfoGrid
                title="참가업체 정보"
                rows={[
                  ['회사명', user.companyName ?? '-'],
                  ['담당자명', user.managerName ?? '-'],
                  ['담당자 연락처', user.contact ?? '-'],
                  ['사업자등록번호', user.businessNo ?? '-'],
                  ['대표자명', user.representativeName ?? '-'],
                  ['업체 대표 연락처', user.companyContact ?? '-'],
                  ['업체 주소', user.companyAddress ?? '-'],
                  ['업종', user.industry ?? '-'],
                ]}
              />
            ) : (
              <InfoGrid
                title="회원 정보"
                rows={[
                  ['이름', user.name ?? '-'],
                  ['연락처', user.contact ?? '-'],
                ]}
              />
            )}
          </>
        )}
      </div>
    </AdminSidebarLayout>
  );
}

export default AdminMemberDetail;
