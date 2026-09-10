import { Fragment, useEffect, useState } from 'react';
import { approveConsultation, getExhibitorConsultations, rejectConsultation } from '../api/expo';
import './MyPage.css';

const STATUS_LABEL = {
  REQUESTED: '대기',
  APPROVED: '승인',
  REJECTED: '반려',
};

const STATUS_BADGE = {
  대기: 'badge--pending',
  승인: 'badge--approved',
  반려: 'badge--rejected',
};

// ISO(2026-05-12T10:00:00) → 화면 표시용(2026.05.12 10:00)
const fmtDateTime = (iso) => (iso ? iso.slice(0, 16).replace('T', ' ').replace(/-/g, '.') : '-');

// 참가업체 - 본인 부스로 들어온 차량 구매/시승 상담 신청 조회·승인·반려 (TASK 6-3)
function ConsultationRequests() {
  const [consultations, setConsultations] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);

  const load = () => {
    getExhibitorConsultations()
      .then((data) => {
        setConsultations(data);
        setLoadError(null);
      })
      .catch((err) =>
        setLoadError(err.response?.data?.error?.message ?? '상담 신청 목록을 불러오지 못했습니다.')
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const consultTypeLabel = (c) => {
    const types = [];
    if (c.wantsPurchase) types.push('구매');
    if (c.wantsTestDrive) types.push('시승');
    return types.join(' + ');
  };

  const startReject = (id) => {
    setRejectingId(id);
    setRejectReason('');
    setActionError(null);
  };

  const cancelReject = () => {
    setRejectingId(null);
    setRejectReason('');
  };

  const handleApprove = (id) => {
    setSubmittingId(id);
    setActionError(null);
    approveConsultation(id)
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

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
      <h1>상담 신청 관리</h1>
      <p className="mypage__cell-muted" style={{ marginBottom: 20 }}>
        본인 부스로 들어온 차량 구매/시승 상담 신청을 확인하고 승인·반려할 수 있습니다.
      </p>

      {actionError && <p className="mypage__cell-muted">{actionError}</p>}
      {loadError && <p className="mypage__cell-muted">{loadError}</p>}

      <section className="mypage__card">
        <div className="mypage__table-scroll">
          <table className="mypage__table">
            <thead>
              <tr>
                <th className="mypage__col-100">부스</th>
                <th className="mypage__col-100">차량</th>
                <th className="mypage__col-120">상담 유형</th>
                <th className="mypage__col-140">희망 일시</th>
                <th className="mypage__col-140">신청일</th>
                <th className="mypage__col-100">상태</th>
                <th className="mypage__col-140 mypage__col-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {!loading && consultations.length === 0 && !loadError && (
                <tr>
                  <td colSpan={7} className="mypage__cell-muted">
                    상담 신청 내역이 없습니다.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={7} className="mypage__cell-muted">
                    불러오는 중...
                  </td>
                </tr>
              )}
              {consultations.map((c) => {
                const statusLabel = STATUS_LABEL[c.status] ?? c.status;
                const isOpen = openId === c.consultationId;
                const isRejecting = rejectingId === c.consultationId;
                const isPending = c.status === 'REQUESTED';
                return (
                  <Fragment key={c.consultationId}>
                    <tr>
                      <td>#{c.boothId}</td>
                      <td>#{c.vehicleId}</td>
                      <td>{consultTypeLabel(c)}</td>
                      <td>
                        {c.preferredDate} {c.preferredTime?.slice(0, 5)}
                      </td>
                      <td>{fmtDateTime(c.createdAt)}</td>
                      <td>
                        <span className={`mypage__badge ${STATUS_BADGE[statusLabel] ?? ''}`}>{statusLabel}</span>
                      </td>
                      <td className="mypage__col-right">
                        {isPending ? (
                          isRejecting ? null : (
                            <>
                              <button
                                type="button"
                                className="mypage__link"
                                disabled={submittingId === c.consultationId}
                                onClick={() => handleApprove(c.consultationId)}
                              >
                                승인
                              </button>{' '}
                              <button
                                type="button"
                                className="mypage__link"
                                disabled={submittingId === c.consultationId}
                                onClick={() => startReject(c.consultationId)}
                              >
                                반려
                              </button>
                            </>
                          )
                        ) : (
                          <button type="button" className="mypage__link" onClick={() => setOpenId(isOpen ? null : c.consultationId)}>
                            {isOpen ? '접기' : '상세'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {isRejecting && (
                      <tr>
                        <td colSpan={7}>
                          <dl className="mypage__detail">
                            <dt>반려 사유 *</dt>
                            <dd>
                              <input
                                style={{ width: '100%', boxSizing: 'border-box', padding: 8 }}
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="반려 사유를 입력하세요"
                                autoFocus
                              />
                            </dd>
                          </dl>
                          <button
                            type="button"
                            className="mypage__link"
                            disabled={!rejectReason.trim() || submittingId === c.consultationId}
                            onClick={() => handleReject(c.consultationId)}
                          >
                            반려 확정
                          </button>{' '}
                          <button type="button" className="mypage__link" onClick={cancelReject}>
                            취소
                          </button>
                        </td>
                      </tr>
                    )}
                    {isOpen && !isPending && (
                      <tr>
                        <td colSpan={7}>
                          <dl className="mypage__detail">
                            <dt>요청 메시지</dt>
                            <dd style={{ whiteSpace: 'pre-line' }}>{c.message || '-'}</dd>
                            {c.status === 'REJECTED' && (
                              <>
                                <dt>반려 사유</dt>
                                <dd>{c.rejectReason}</dd>
                              </>
                            )}
                          </dl>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default ConsultationRequests;
