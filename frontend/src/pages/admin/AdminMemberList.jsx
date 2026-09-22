import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminUsers } from '../../api/identity';
import './AdminApplications.css';
import './AdminMemberList.css';

const ROLE_LABEL = { USER: '일반회원', EXHIBITOR: '참가업체', ADMIN: '관리자' };
const STATUS_LABEL = { ACTIVE: '활성', LOCKED: '정지', WITHDRAWN: '탈퇴' };
const STATUS_CLASS = { ACTIVE: 'admin-badge--approved', LOCKED: 'admin-badge--rejected', WITHDRAWN: 'admin-badge--pending' };

const PAGE_SIZE = 20;

// ISO(2026-01-20T10:14:00) → 2026.01.20
const fmtDate = (iso) => (iso ? iso.slice(0, 10).replace(/-/g, '.') : '-');

function AdminMemberList() {
  const navigate = useNavigate();
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [result, setResult] = useState({ content: [], totalPages: 1, totalElements: 0 });
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    getAdminUsers({
      keyword: keyword || undefined,
      role: role || undefined,
      status: status || undefined,
      page,
      size: PAGE_SIZE,
    })
      .then((res) => {
        setResult(res);
        setLoadError(null);
      })
      .catch((err) => setLoadError(err.response?.data?.error?.message ?? '회원 목록을 불러오지 못했습니다.'));
  }, [keyword, role, status, page]);

  const submitSearch = (e) => {
    e.preventDefault();
    setPage(0);
    setKeyword(keywordInput.trim());
  };

  return (
    <div className="admin-applications">
      <section className="admin-applications__hero">
        <p className="admin-applications__eyebrow">EXHIBITOR MANAGEMENT PORTAL</p>
        <h1>회원 관리</h1>
        <p>전체 회원을 검색하고 상세 정보를 확인할 수 있습니다.</p>
      </section>

      <section className="admin-member-list__filters">
        <div className="admin-member-list__search">
          <input
            type="text"
            placeholder="이메일, 이름, 회사명 검색"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitSearch(e)}
          />
          <button type="button" onClick={submitSearch}>검색</button>
        </div>
        <select value={role} onChange={(e) => { setRole(e.target.value); setPage(0); }}>
          <option value="">전체 역할</option>
          <option value="USER">일반회원</option>
          <option value="EXHIBITOR">참가업체</option>
          <option value="ADMIN">관리자</option>
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
          <option value="">전체 상태</option>
          <option value="ACTIVE">활성</option>
          <option value="LOCKED">정지</option>
          <option value="WITHDRAWN">탈퇴</option>
        </select>
      </section>

      {loadError && <p className="admin-applications__error">{loadError}</p>}

      <div className="admin-applications__table-card">
        <table className="admin-applications__table">
          <thead>
            <tr>
              <th>이메일</th>
              <th>이름 / 회사명</th>
              <th>역할</th>
              <th>상태</th>
              <th>가입일</th>
            </tr>
          </thead>
          <tbody>
            {result.content.length === 0 && !loadError && (
              <tr><td colSpan={5} style={{ color: '#64748b' }}>조건에 맞는 회원이 없습니다.</td></tr>
            )}
            {result.content.map((user) => (
              <tr
                key={user.id}
                className="is-open"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/admin/members/${user.id}`)}
              >
                <td>{user.email}</td>
                <td>{user.name ?? user.companyName ?? '-'}</td>
                <td>{ROLE_LABEL[user.role] ?? user.role}</td>
                <td>
                  <span className={`admin-badge ${STATUS_CLASS[user.status] ?? ''}`}>
                    {STATUS_LABEL[user.status] ?? user.status}
                  </span>
                </td>
                <td>{fmtDate(user.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result.totalPages > 1 && (
        <div className="admin-applications__pagination">
          {Array.from({ length: result.totalPages }, (_, i) => i).map((p) => (
            <button key={p} type="button" className={p === page ? 'is-active' : ''} onClick={() => setPage(p)}>
              {p + 1}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(result.totalPages - 1, p + 1))}
            aria-label="다음"
            disabled={page === result.totalPages - 1}
          >
            &gt;
          </button>
        </div>
      )}
    </div>
  );
}

export default AdminMemberList;
