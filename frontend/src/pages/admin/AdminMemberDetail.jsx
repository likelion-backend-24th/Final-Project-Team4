import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAdminUserDetail } from '../../api/identity';
import { EmptyState, PageContainer, PageHero } from '@/components/layout/Page';
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

  return (
    <div>
      <PageHero eyebrow="EXHIBITOR MANAGEMENT PORTAL" title="회원 상세">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-4 -ml-2 text-slate-300 hover:bg-white/10 hover:text-white"
          onClick={() => navigate('/admin/members')}
        >
          <ArrowLeft /> 회원 목록
        </Button>
      </PageHero>

      <PageContainer className="flex flex-col gap-5">
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
      </PageContainer>
    </div>
  );
}

export default AdminMemberDetail;
