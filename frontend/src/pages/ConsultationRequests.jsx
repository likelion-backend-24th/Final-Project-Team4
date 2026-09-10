import { useEffect, useMemo, useState } from 'react';
import { approveConsultation, getBoothVehicles, getExhibitorConsultations, getMyBoothApplications, rejectConsultation } from '../api/expo';
import './ConsultationRequests.css';

const STATUS_LABEL = {
  REQUESTED: '대기',
  APPROVED: '승인',
  REJECTED: '반려',
};

const STATUS_BADGE = {
  REQUESTED: 'cr-badge--pending',
  APPROVED: 'cr-badge--approved',
  REJECTED: 'cr-badge--rejected',
};

// ISO(2026-05-12T10:00:00) → 화면 표시용(2026.05.12 10:00)
const fmtDateTime = (iso) => (iso ? iso.slice(0, 16).replace('T', ' ').replace(/-/g, '.') : '-');

// 참가업체 - 본인 부스로 들어온 차량 구매/시승 상담 신청 조회·승인·반려 (TASK 6-3)
// 어떤 박람회/부스/차량에서 들어온 신청인지 한눈에 알 수 있도록 박람회 단위로 묶어서 보여준다.
function ConsultationRequests() {
  const [consultations, setConsultations] = useState([]);
  const [boothInfoMap, setBoothInfoMap] = useState({}); // boothId -> { expoTitle, boothNo }
  const [vehicleNameMap, setVehicleNameMap] = useState({}); // vehicleId -> name
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);

  const loadBoothInfo = () =>
    getMyBoothApplications({ size: 200 }).then((res) => {
      const map = {};
      res.content.forEach((group) => {
        group.applications.forEach((app) => {
          map[app.boothId] = { expoTitle: group.expoTitle, boothNo: app.boothNo };
        });
      });
      setBoothInfoMap(map);
    });

  const loadVehicleNames = (list) => {
    const boothIds = [...new Set(list.map((c) => c.boothId))];
    Promise.all(boothIds.map((id) => getBoothVehicles(id).catch(() => [])))
      .then((results) => {
        const map = {};
        results.forEach((vehicles) => vehicles.forEach((v) => (map[v.vehicleId] = v.name)));
        setVehicleNameMap(map);
      })
      .catch(() => {});
  };

  const load = () => {
    getExhibitorConsultations()
      .then((data) => {
        setConsultations(data);
        setLoadError(null);
        loadVehicleNames(data);
      })
      .catch((err) =>
        setLoadError(err.response?.data?.error?.message ?? '상담 신청 목록을 불러오지 못했습니다.')
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    loadBoothInfo().catch(() => {});
  }, []);

  const consultTypeLabel = (c) => [c.wantsPurchase && '구매', c.wantsTestDrive && '시승'].filter(Boolean).join(' + ');

  const startReject = (id) => {
    setRejectingId(id);
    setRejectReason('');
    setActionError(null);
  };

  const cancelReject = () => {
    setRejectingId(null);
    setRejectReason('');
  };

  const handleApprove = (c) => {
    const boothInfo = boothInfoMap[c.boothId];
    const vehicleName = vehicleNameMap[c.vehicleId] ?? `차량 #${c.vehicleId}`;
    const confirmed = window.confirm(
      `${boothInfo?.expoTitle ?? ''} / ${boothInfo?.boothNo ?? `부스 #${c.boothId}`} - ${vehicleName}\n${consultTypeLabel(c)} 상담 신청을 승인할까요?`
    );
    if (!confirmed) return;

    setSubmittingId(c.consultationId);
    setActionError(null);
    approveConsultation(c.consultationId)
      .then(load)
      .catch((err) => setActionError(err.response?.data?.error?.message ?? '승인 처리 중 오류가 발생했습니다.'))
      .finally(() => setSubmittingId(null));
  };

  const handleReject = (id) => {
    if (!rejectReason.trim()) return;
    setSubmittingId(id);
    setActionError(null);
    rejectConsultation(id, rejectReason.trim())
      .then(() => {
        cancelReject();
        load();
      })
      .catch((err) => setActionError(err.response?.data?.error?.message ?? '반려 처리 중 오류가 발생했습니다.'))
      .finally(() => setSubmittingId(null));
  };

  // 박람회별로 묶어서 보여준다 - 어떤 박람회에서 들어온 신청인지 한눈에 파악할 수 있도록.
  const groupedByExpo = useMemo(() => {
    const groups = new Map();
    consultations.forEach((c) => {
      const info = boothInfoMap[c.boothId];
      const key = info?.expoTitle ?? '박람회 정보 확인 중...';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(c);
    });
    return Array.from(groups.entries());
  }, [consultations, boothInfoMap]);

  const pendingCount = consultations.filter((c) => c.status === 'REQUESTED').length;

  return (
    <main className="cr-page">
      <h1>상담 신청 관리</h1>
      <p className="cr-subtitle">
        본인 부스로 들어온 차량 구매/시승 상담 신청을 박람회별로 확인하고 승인·반려할 수 있습니다.
        {pendingCount > 0 && <span className="cr-pending-count"> 대기 중 {pendingCount}건</span>}
      </p>

      {actionError && <p className="cr-error">{actionError}</p>}
      {loadError && <p className="cr-error">{loadError}</p>}
      {loading && <p className="cr-empty">불러오는 중...</p>}
      {!loading && consultations.length === 0 && !loadError && (
        <p className="cr-empty">상담 신청 내역이 없습니다.</p>
      )}

      {groupedByExpo.map(([expoTitle, items]) => (
        <section key={expoTitle} className="cr-expo-group">
          <h2 className="cr-expo-group__title">{expoTitle}</h2>
          <div className="cr-card-list">
            {items.map((c) => {
              const boothInfo = boothInfoMap[c.boothId];
              const vehicleName = vehicleNameMap[c.vehicleId] ?? `차량 #${c.vehicleId}`;
              const isExpanded = expandedId === c.consultationId;
              const isRejecting = rejectingId === c.consultationId;
              const isPending = c.status === 'REQUESTED';
              const isSubmitting = submittingId === c.consultationId;

              return (
                <div key={c.consultationId} className={`cr-card ${isPending ? 'cr-card--pending' : ''}`}>
                  <div className="cr-card__top">
                    <div className="cr-card__main">
                      <span className={`cr-badge ${STATUS_BADGE[c.status] ?? ''}`}>{STATUS_LABEL[c.status] ?? c.status}</span>
                      <span className="cr-card__vehicle">{vehicleName}</span>
                      <span className="cr-card__booth">{boothInfo?.boothNo ?? `부스 #${c.boothId}`}</span>
                    </div>
                    <button type="button" className="cr-link" onClick={() => setExpandedId(isExpanded ? null : c.consultationId)}>
                      {isExpanded ? '접기 ▲' : '상세 보기 ▼'}
                    </button>
                  </div>

                  <div className="cr-card__meta">
                    <span>{consultTypeLabel(c)} 상담</span>
                    <span className="cr-dot" />
                    <span>희망 일시 {c.preferredDate} {c.preferredTime?.slice(0, 5)}</span>
                    <span className="cr-dot" />
                    <span>신청일 {fmtDateTime(c.createdAt)}</span>
                  </div>

                  {isExpanded && (
                    <div className="cr-card__detail">
                      <dl>
                        <dt>요청 메시지</dt>
                        <dd style={{ whiteSpace: 'pre-line' }}>{c.message || '-'}</dd>
                        {c.status === 'REJECTED' && (
                          <>
                            <dt>반려 사유</dt>
                            <dd>{c.rejectReason}</dd>
                          </>
                        )}
                      </dl>
                    </div>
                  )}

                  {isPending && (
                    <div className="cr-card__actions">
                      {isRejecting ? (
                        <div className="cr-reject-form">
                          <input
                            className="cr-reject-form__input"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="반려 사유를 입력하세요 (필수)"
                            autoFocus
                          />
                          <button
                            type="button"
                            className="cr-btn cr-btn--reject-confirm"
                            disabled={!rejectReason.trim() || isSubmitting}
                            onClick={() => handleReject(c.consultationId)}
                          >
                            반려 확정
                          </button>
                          <button type="button" className="cr-btn cr-btn--cancel" onClick={cancelReject}>
                            취소
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="cr-btn cr-btn--reject"
                            disabled={isSubmitting}
                            onClick={() => startReject(c.consultationId)}
                          >
                            반려
                          </button>
                          <button
                            type="button"
                            className="cr-btn cr-btn--approve"
                            disabled={isSubmitting}
                            onClick={() => handleApprove(c)}
                          >
                            승인
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}

export default ConsultationRequests;
