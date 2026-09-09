import { useEffect, useState } from 'react';
import { getAdminExpoList } from '../../api/expo';
import './AdminApplications.css';

function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    // size를 넉넉히 줘서 박람회가 많아져도 대시보드 합계가 누락되지 않게 함
    getAdminExpoList({ size: 1000 })
      .then((res) => {
        const expos = res.content ?? [];
        setStats(
          expos.reduce(
            (acc, e) => ({
              total: acc.total + e.totalApplications,
              pending: acc.pending + e.pendingCount,
              approved: acc.approved + e.approvedCount,
              rejected: acc.rejected + e.rejectedCount,
            }),
            { total: 0, pending: 0, approved: 0, rejected: 0 }
          )
        );
      })
      .catch((err) =>
        setLoadError(err.response?.data?.error?.message ?? '현황을 불러오지 못했습니다.'),
      );
  }, []);

  return (
    <div className="admin-applications">
      <section className="admin-applications__hero">
        <p className="admin-applications__eyebrow">EXHIBITOR MANAGEMENT PORTAL</p>
        <h1>관리자 대시보드</h1>
        <p>전체 박람회 운영 현황을 한눈에 확인합니다.</p>
      </section>

      {loadError && <p className="admin-applications__error">{loadError}</p>}

      <section className="admin-applications__stats">
        <div className="admin-stat-card">
          <p>전체 신청 건수</p>
          <strong>{stats.total}건</strong>
        </div>
        <div className="admin-stat-card">
          <p>심사 대기 건수</p>
          <strong className="is-pending">{stats.pending}건</strong>
        </div>
        <div className="admin-stat-card">
          <p>최종 승인 완료</p>
          <strong className="is-approved">{stats.approved}건</strong>
        </div>
        <div className="admin-stat-card">
          <p>신청 반려 내역</p>
          <strong className="is-rejected">{stats.rejected}건</strong>
        </div>
      </section>
    </div>
  );
}

export default AdminDashboard;