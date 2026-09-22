import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAdminUserDetail } from '../../api/identity';
import './AdminApplications.css';

const ROLE_LABEL = { USER: '일반회원', EXHIBITOR: '참가업체', ADMIN: '관리자' };
const STATUS_LABEL = { ACTIVE: '활성', LOCKED: '정지', WITHDRAWN: '탈퇴' };
const STATUS_CLASS = { ACTIVE: 'admin-badge--approved', LOCKED: 'admin-badge--rejected', WITHDRAWN: 'admin-badge--pending' };
const PROVIDER_LABEL = { GOOGLE: '구글', KAKAO: '카카오', NAVER: '네이버' };

// ISO(2026-01-20T10:14:00) → 2026.01.20 10:14
const fmtDateTime = (iso) => (iso ? iso.slice(0, 16).replace('T', ' ').replace(/-/g, '.') : '-');

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

  return (
    <div className="admin-applications">
      <section className="admin-applications__hero">
        <p className="admin-applications__eyebrow">EXHIBITOR MANAGEMENT PORTAL</p>
        <button
          type="button"
          className="admin-applications__toggle"
          style={{ padding: 0, marginBottom: 8 }}
          onClick={() => navigate('/admin/members')}
        >
          ← 회원 목록으로
        </button>
        <h1>회원 상세</h1>
      </section>

      {loadError && <p className="admin-applications__error">{loadError}</p>}

      {user && (
        <div className="admin-applications__detail" style={{ padding: '0 32px 32px' }}>
          <section className="admin-review__card">
            <h3>기본 정보</h3>
            <dl className="admin-review__info-grid">
              <dt>이메일</dt>
              <dd>{user.email}</dd>
              <dt>역할</dt>
              <dd>{ROLE_LABEL[user.role] ?? user.role}</dd>
              <dt>상태</dt>
              <dd>
                <span className={`admin-badge ${STATUS_CLASS[user.status] ?? ''}`}>
                  {STATUS_LABEL[user.status] ?? user.status}
                </span>
              </dd>
              <dt>로그인 방식</dt>
              <dd>{user.provider ? `소셜(${PROVIDER_LABEL[user.provider] ?? user.provider})` : '이메일'}</dd>
              <dt>가입일</dt>
              <dd>{fmtDateTime(user.createdAt)}</dd>
              <dt>최근 수정일</dt>
              <dd>{fmtDateTime(user.updatedAt)}</dd>
            </dl>
          </section>

          {user.role === 'EXHIBITOR' ? (
            <section className="admin-review__card">
              <h3>참가업체 정보</h3>
              <dl className="admin-review__detail-dl">
                <dt>회사명</dt>
                <dd>{user.companyName ?? '-'}</dd>
                <dt>담당자명</dt>
                <dd>{user.managerName ?? '-'}</dd>
                <dt>담당자 연락처</dt>
                <dd>{user.contact ?? '-'}</dd>
                <dt>사업자등록번호</dt>
                <dd>{user.businessNo ?? '-'}</dd>
                <dt>대표자명</dt>
                <dd>{user.representativeName ?? '-'}</dd>
                <dt>업체 대표 연락처</dt>
                <dd>{user.companyContact ?? '-'}</dd>
                <dt>업체 주소</dt>
                <dd>{user.companyAddress ?? '-'}</dd>
                <dt>업종</dt>
                <dd>{user.industry ?? '-'}</dd>
              </dl>
            </section>
          ) : (
            <section className="admin-review__card">
              <h3>회원 정보</h3>
              <dl className="admin-review__detail-dl">
                <dt>이름</dt>
                <dd>{user.name ?? '-'}</dd>
                <dt>연락처</dt>
                <dd>{user.contact ?? '-'}</dd>
              </dl>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminMemberDetail;
