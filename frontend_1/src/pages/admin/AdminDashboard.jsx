import { mockAdminStats } from '../../mock/data';
import './AdminApplications.css';

function AdminDashboard() {
  return (
    <div className="admin-applications">
      <section className="admin-applications__hero">
        <p className="admin-applications__eyebrow">EXHIBITOR MANAGEMENT PORTAL</p>
        <h1>관리자 대시보드</h1>
        <p>전체 박람회 운영 현황을 한눈에 확인합니다. (목업)</p>
      </section>

      <section className="admin-applications__stats">
        <div className="admin-stat-card">
          <p>전체 신청 건수</p>
          <strong>{mockAdminStats.total}건</strong>
        </div>
        <div className="admin-stat-card">
          <p>심사 대기 건수</p>
          <strong className="is-pending">{mockAdminStats.pending}건</strong>
        </div>
        <div className="admin-stat-card">
          <p>최종 승인 완료</p>
          <strong className="is-approved">{mockAdminStats.approved}건</strong>
        </div>
        <div className="admin-stat-card">
          <p>신청 반려 내역</p>
          <strong className="is-rejected">{mockAdminStats.rejected}건</strong>
        </div>
      </section>
    </div>
  );
}

export default AdminDashboard;
