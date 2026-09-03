import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminExpoList } from '../../api/expo';
import './AdminApplications.css';

const EXPO_STATUS_LABEL = {
  DRAFT: '비공개',
  OPEN: '모집중',
};

function AdminExpoList() {
  const navigate = useNavigate();
  const [expos, setExpos] = useState([]);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    getAdminExpoList()
      .then((res) => setExpos(res.content))
      .catch((err) => setLoadError(err.response?.data?.error?.message ?? '박람회 목록을 불러오지 못했습니다.'));
  }, []);

  // 심사 대기가 많은(급한) 박람회를 위로
  const sorted = [...expos].sort((a, b) => b.pendingCount - a.pendingCount);

  return (
    <div className="admin-applications">
      <section className="admin-applications__hero">
        <p className="admin-applications__eyebrow">EXHIBITOR MANAGEMENT PORTAL</p>
        <h1>참가 신청 관리</h1>
        <p>박람회를 선택하면 해당 박람회의 실시간 부스 배치 현황과 참가 신청 목록을 확인할 수 있습니다.</p>
      </section>

      {loadError && <p className="admin-applications__error">{loadError}</p>}

      <section className="admin-expo-list">
        {sorted.length === 0 && !loadError && (
          <p className="admin-applications__error" style={{ color: '#64748b' }}>등록된 박람회가 없습니다.</p>
        )}
        {sorted.map((expo) => {
          const boothFillRatio = expo.totalBooths > 0
            ? Math.round(((expo.totalBooths - expo.availableBooths) / expo.totalBooths) * 100)
            : 0;
          const reviewedTotal = expo.approvedCount + expo.rejectedCount;
          const approvedRatio = expo.totalApplications > 0 ? (expo.approvedCount / expo.totalApplications) * 100 : 0;
          const rejectedRatio = expo.totalApplications > 0 ? (expo.rejectedCount / expo.totalApplications) * 100 : 0;
          const pendingRatio = expo.totalApplications > 0 ? (expo.pendingCount / expo.totalApplications) * 100 : 0;

          return (
            <button
              key={expo.expoId}
              type="button"
              className={`admin-expo-card admin-expo-card--${expo.status.toLowerCase()}`}
              onClick={() => navigate(`/admin/applications/${expo.expoId}`)}
            >
              <div className="admin-expo-card__accent" />
              <div className="admin-expo-card__body">
                <div className="admin-expo-card__header">
                  <span className={`admin-badge ${expo.status === 'OPEN' ? 'admin-badge--approved' : 'admin-badge--pending'}`}>
                    {EXPO_STATUS_LABEL[expo.status] ?? expo.status}
                  </span>
                  {expo.pendingCount > 0 && (
                    <span className="admin-expo-card__urgent">심사 대기 {expo.pendingCount}건</span>
                  )}
                </div>
                <h2>{expo.title}</h2>
                <p className="admin-expo-card__period">
                  신청 기간 {expo.applyStartsAt.slice(0, 10)} ~ {expo.applyEndsAt.slice(0, 10)}
                </p>

                <div className="admin-expo-card__section">
                  <div className="admin-expo-card__section-label">
                    <span>신청 처리 현황</span>
                    <span className="admin-expo-card__section-value">{expo.totalApplications}건</span>
                  </div>
                  {expo.totalApplications > 0 ? (
                    <div className="admin-expo-card__bar">
                      <span className="admin-expo-card__bar-segment admin-expo-card__bar-segment--approved" style={{ width: `${approvedRatio}%` }} />
                      <span className="admin-expo-card__bar-segment admin-expo-card__bar-segment--pending" style={{ width: `${pendingRatio}%` }} />
                      <span className="admin-expo-card__bar-segment admin-expo-card__bar-segment--rejected" style={{ width: `${rejectedRatio}%` }} />
                    </div>
                  ) : (
                    <div className="admin-expo-card__bar admin-expo-card__bar--empty" />
                  )}
                  <div className="admin-expo-card__legend-row">
                    <span><i className="admin-expo-card__dot admin-expo-card__dot--approved" />승인 {expo.approvedCount}</span>
                    <span><i className="admin-expo-card__dot admin-expo-card__dot--pending" />대기 {expo.pendingCount}</span>
                    <span><i className="admin-expo-card__dot admin-expo-card__dot--rejected" />반려 {expo.rejectedCount}</span>
                  </div>
                </div>

                <div className="admin-expo-card__section">
                  <div className="admin-expo-card__section-label">
                    <span>부스 배정 현황</span>
                    <span className="admin-expo-card__section-value">{expo.totalBooths - expo.availableBooths} / {expo.totalBooths}</span>
                  </div>
                  <div className="admin-expo-card__bar">
                    <span className="admin-expo-card__bar-segment admin-expo-card__bar-segment--filled" style={{ width: `${boothFillRatio}%` }} />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </section>
    </div>
  );
}

export default AdminExpoList;
