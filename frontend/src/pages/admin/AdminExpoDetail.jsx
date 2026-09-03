import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  approveBoothApplication,
  getAdminBoothApplications,
  getAdminExpoBooths,
  rejectBoothApplication,
} from '../../api/expo';
import BoothGrid from '../../components/BoothGrid';
import './AdminApplications.css';

const STATUS_LABEL = {
  DRAFT: '임시저장',
  SUBMITTED: '심사중',
  PAYMENT_PENDING: '승인',
  CONFIRMED: '참가 확정',
  REJECTED: '반려',
  REFUND_REQUIRED: '환불 대기',
  CANCELLED: '취소됨',
};

const STATUS_CLASS = {
  심사중: 'admin-badge--pending',
  승인: 'admin-badge--approved',
  '참가 확정': 'admin-badge--approved',
  반려: 'admin-badge--rejected',
  취소됨: 'admin-badge--rejected',
};

const FILTER_TABS = ['전체', '심사중', '승인', '반려'];

// 그룹별 보기 / 부스별 보기 양쪽에서 재사용하는 "부스 선택 → 메모 → 승인/반려" 패널.
// applicants: 선택 대상 목록. renderLabel(app): 리스트 항목에 보여줄 라벨(부스번호만 vs 업체+부스번호).
function BoothDecisionPanel({ applicants, renderLabel, selectedApplicationId, onSelect, memo, setMemo, onApprove, onReject, isSubmitting, actionError }) {
  const selectedApp = applicants.find((a) => a.applicationId === selectedApplicationId);

  return (
    <>
      <ul className="admin-applications__booth-list">
        {applicants.map((app) => {
          const isSelected = selectedApplicationId === app.applicationId;
          const isActionable = app.statusLabel === '심사중';
          return (
            <li
              key={app.applicationId}
              className={[isSelected && 'is-selected', isActionable && 'is-selectable'].filter(Boolean).join(' ')}
              onClick={() => isActionable && onSelect(app.applicationId)}
            >
              <div className="admin-applications__booth-list-row">
                <span className="admin-applications__booth-list-radio">
                  {isActionable && (
                    <input
                      type="radio"
                      name="booth-decision-select"
                      checked={isSelected}
                      onChange={() => onSelect(app.applicationId)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </span>
                <span className="is-strong">{renderLabel(app)}</span>
                <span className={`admin-badge ${STATUS_CLASS[app.statusLabel] ?? ''}`}>{app.statusLabel}</span>
              </div>
              {app.rejectReason && (
                <p className="admin-applications__reject-reason">사유: {app.rejectReason}</p>
              )}
            </li>
          );
        })}
      </ul>

      <label className="admin-applications__memo-label">
        {selectedApp ? `${renderLabel(selectedApp)} 심사 메모 (반려 시 사유로 전달됨)` : '심사할 부스를 선택하세요'}
      </label>
      <textarea
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder='예: "해당 부스 배정 승인 전, 전력 추가 용량(3kW) 공급 가능 여부 전시 기술팀 협의 필요."'
        rows={4}
        disabled={!selectedApp}
      />
      {actionError && <p className="admin-applications__memo-notice">{actionError}</p>}
      <div className="admin-applications__decision">
        <button
          className="admin-applications__reject"
          disabled={!selectedApp || !memo.trim() || isSubmitting}
          title={!selectedApp ? '부스를 먼저 선택하세요' : !memo.trim() ? '반려 사유를 입력하세요' : undefined}
          onClick={() => onReject(selectedApp, memo)}
        >
          {selectedApp ? `${renderLabel(selectedApp)} 반려` : '신청 반려'}
        </button>
        <button
          className="admin-applications__approve"
          disabled={!selectedApp || isSubmitting}
          onClick={() => onApprove(selectedApp)}
        >
          {selectedApp ? `${renderLabel(selectedApp)} 승인` : '신청 승인 완료'}
        </button>
      </div>
    </>
  );
}

function AdminExpoDetail() {
  const { expoId } = useParams();
  const navigate = useNavigate();

  const [expoBooths, setExpoBooths] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [openBoothKey, setOpenBoothKey] = useState(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState(null);
  const [memo, setMemo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);

  const selectDefault = (applications) => {
    const firstPending = applications.find((a) => a.statusLabel === '심사중');
    setSelectedApplicationId((firstPending ?? applications[0])?.applicationId ?? null);
  };

  const toggleGroup = (group) => {
    const isOpen = openId === group.groupId;
    setOpenId(isOpen ? null : group.groupId);
    setMemo('');
    setActionError(null);
    // 펼칠 때 심사 대기중인 부스를 기본 선택, 없으면 첫 부스
    if (!isOpen) {
      selectDefault(group.applications);
    } else {
      setSelectedApplicationId(null);
    }
  };

  const toggleBoothRow = (row) => {
    const isOpen = openBoothKey === row.key;
    setOpenBoothKey(isOpen ? null : row.key);
    setMemo('');
    setActionError(null);
    if (!isOpen) {
      selectDefault(row.applicants);
    } else {
      setSelectedApplicationId(null);
    }
  };
  const [filter, setFilter] = useState('전체');
  const [view, setView] = useState('group'); // 'group' | 'booth'

  const loadApplications = () => {
    getAdminBoothApplications({ size: 200 })
      .then((res) => {
        const scoped = res.content
          .filter((g) => String(g.expoId) === expoId)
          .map((group) => ({
            ...group,
            applications: group.applications.map((app) => ({
              ...app,
              statusLabel: STATUS_LABEL[app.status] ?? app.status,
            })),
          }));
        setGroups(scoped);
      })
      .catch((err) => setLoadError(err.response?.data?.error?.message ?? '신청 목록을 불러오지 못했습니다.'));
  };

  const loadBooths = () => {
    getAdminExpoBooths(expoId)
      .then(setExpoBooths)
      .catch((err) => setLoadError(err.response?.data?.error?.message ?? '부스 배치 정보를 불러오지 못했습니다.'));
  };

  useEffect(() => {
    loadBooths();
    loadApplications();
  }, [expoId]);

  const handleApprove = (app) => {
    if (!app) return;
    setIsSubmitting(true);
    setActionError(null);
    approveBoothApplication(app.applicationId)
      .then(() => {
        setMemo('');
        loadApplications();
        loadBooths();
      })
      .catch((err) => setActionError(err.response?.data?.error?.message ?? '승인 처리 중 오류가 발생했습니다.'))
      .finally(() => setIsSubmitting(false));
  };

  const handleReject = (app, reason) => {
    if (!app || !reason.trim()) return;
    setIsSubmitting(true);
    setActionError(null);
    rejectBoothApplication(app.applicationId, reason.trim())
      .then(() => {
        setMemo('');
        loadApplications();
      })
      .catch((err) => setActionError(err.response?.data?.error?.message ?? '반려 처리 중 오류가 발생했습니다.'))
      .finally(() => setIsSubmitting(false));
  };

  const allApplications = useMemo(
    () => groups.flatMap((g) => g.applications.map((app) => ({ ...app, group: g }))),
    [groups]
  );

  const stats = {
    total: allApplications.length,
    pending: allApplications.filter((a) => a.statusLabel === '심사중').length,
    approved: allApplications.filter((a) => a.statusLabel === '승인' || a.statusLabel === '참가 확정').length,
    rejected: allApplications.filter((a) => a.statusLabel === '반려').length,
  };

  const filteredGroups = useMemo(() => {
    if (filter === '전체') return groups;
    return groups
      .map((g) => ({ ...g, applications: g.applications.filter((a) => a.statusLabel === filter) }))
      .filter((g) => g.applications.length > 0);
  }, [groups, filter]);

  const boothRows = useMemo(() => {
    const map = new Map();
    for (const app of allApplications) {
      if (filter !== '전체' && app.statusLabel !== filter) continue;
      if (!map.has(app.boothNo)) {
        map.set(app.boothNo, { key: app.boothNo, boothNo: app.boothNo, applicants: [] });
      }
      map.get(app.boothNo).applicants.push(app);
    }
    return Array.from(map.values()).sort((a, b) => b.applicants.length - a.applicants.length);
  }, [allApplications, filter]);

  return (
    <div className="admin-applications">
      <section className="admin-applications__hero">
        <button type="button" className="admin-expo-detail__back" onClick={() => navigate('/admin/applications')}>
          ← 박람회 목록
        </button>
        <p className="admin-applications__eyebrow">EXHIBITOR MANAGEMENT PORTAL</p>
        <h1>{expoBooths ? expoBooths.title : '박람회 참가 신청 관리'}</h1>
        <p>실시간 부스 배치 현황과 참가 신청 내역을 확인하고 심사합니다.</p>
      </section>

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

      {loadError && <p className="admin-applications__error">{loadError}</p>}

      <section className="admin-applications__table-card">
        <div className="admin-expo-detail__booth-header">
          <h2>실시간 부스 배치 현황</h2>
          <div className="admin-applications__legend">
            <span><i className="dot dot--available" /> 선택가능</span>
            <span><i className="dot dot--assigned" /> 예약됨</span>
          </div>
        </div>
        {expoBooths ? (
          <div className="admin-expo-detail__booth-grid">
            <BoothGrid booths={expoBooths.booths} selectedBoothIds={[]} onToggle={() => {}} />
          </div>
        ) : (
          !loadError && <p className="admin-applications__cell-muted" style={{ padding: 16 }}>불러오는 중...</p>
        )}
      </section>

      <div className="admin-applications__toolbar">
        <div className="admin-applications__tabs">
          {FILTER_TABS.map((t) => (
            <button key={t} className={filter === t ? 'is-active' : ''} onClick={() => setFilter(t)}>
              {t}
            </button>
          ))}
        </div>
        <div className="admin-applications__view-toggle">
          <button className={view === 'group' ? 'is-active' : ''} onClick={() => setView('group')}>
            그룹별 보기
          </button>
          <button className={view === 'booth' ? 'is-active' : ''} onClick={() => setView('booth')}>
            부스별 보기 (경쟁 확인)
          </button>
        </div>
      </div>

      {view === 'group' ? (
        <section className="admin-applications__table-card">
          <div className="admin-applications__table-scroll">
            <table className="admin-applications__table">
              <thead>
                <tr>
                  <th>참가업체 ID</th>
                  <th>신청 부스</th>
                  <th>신청일</th>
                  <th>동작</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.length === 0 && !loadError && (
                  <tr><td colSpan={4}>신청 내역이 없습니다.</td></tr>
                )}
                {filteredGroups.map((group) => {
                  const isOpen = openId === group.groupId;
                  return (
                    <Fragment key={group.groupId}>
                      <tr className={isOpen ? 'is-open' : ''}>
                        <td className="is-strong">#{group.exhibitorId}</td>
                        <td>
                          <div className="admin-applications__chip-row">
                            {group.applications.map((app) => (
                              <span key={app.applicationId} className="admin-applications__chip">
                                {app.boothNo}
                                <span className={`admin-badge ${STATUS_CLASS[app.statusLabel] ?? ''}`}>
                                  {app.statusLabel}
                                </span>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>{group.createdAt.slice(0, 10)}</td>
                        <td>
                          <button
                            className="admin-applications__toggle"
                            onClick={() => toggleGroup(group)}
                          >
                            {isOpen ? '접기 ▲' : '펼치기 ▼'}
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="admin-applications__detail-row">
                          <td colSpan={4}>
                            <div className="admin-applications__detail">
                              <div className="admin-applications__detail-col">
                                <h3>신청 업체 정보</h3>
                                <dl>
                                  <dt>참가업체 ID</dt>
                                  <dd>#{group.exhibitorId}</dd>
                                  <dt>신청 그룹</dt>
                                  <dd>{group.groupId}</dd>
                                </dl>
                                <h3>부스 참가 상세 신청 정보</h3>
                                <dl>
                                  <dt>주요 전시 품목</dt>
                                  <dd>{group.exhibitionItem}</dd>
                                  <dt>전시 컨셉 설명</dt>
                                  <dd>{group.conceptDescription}</dd>
                                  <dt>추가 요청 사항</dt>
                                  <dd>{group.additionalRequest || '-'}</dd>
                                </dl>
                              </div>
                              <div className="admin-applications__detail-col">
                                <h3>부스별 심사 현황 (부스를 선택해 개별 승인/반려)</h3>
                                <BoothDecisionPanel
                                  applicants={group.applications}
                                  renderLabel={(app) => app.boothNo}
                                  selectedApplicationId={selectedApplicationId}
                                  onSelect={setSelectedApplicationId}
                                  memo={memo}
                                  setMemo={setMemo}
                                  onApprove={handleApprove}
                                  onReject={handleReject}
                                  isSubmitting={isSubmitting}
                                  actionError={actionError}
                                />
                              </div>
                            </div>
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
      ) : (
        <section className="admin-applications__table-card">
          <div className="admin-applications__table-scroll">
            <table className="admin-applications__table">
              <thead>
                <tr>
                  <th>부스번호</th>
                  <th>경쟁 신청</th>
                  <th>신청 업체 / 상태</th>
                  <th>동작</th>
                </tr>
              </thead>
              <tbody>
                {boothRows.length === 0 && !loadError && (
                  <tr><td colSpan={4}>신청 내역이 없습니다.</td></tr>
                )}
                {boothRows.map((row) => {
                  const isOpen = openBoothKey === row.key;
                  return (
                    <Fragment key={row.key}>
                      <tr className={[row.applicants.length > 1 && 'admin-applications__competing-row', isOpen && 'is-open'].filter(Boolean).join(' ')}>
                        <td className="is-strong">{row.boothNo}</td>
                        <td>
                          {row.applicants.length > 1 ? (
                            <span className="admin-badge admin-badge--pending">경쟁 {row.applicants.length}건</span>
                          ) : (
                            <span className="admin-applications__cell-muted">단독 신청</span>
                          )}
                        </td>
                        <td>
                          <div className="admin-applications__chip-row">
                            {row.applicants.map((app) => (
                              <span key={app.applicationId} className="admin-applications__chip">
                                #{app.group.exhibitorId}
                                <span className={`admin-badge ${STATUS_CLASS[app.statusLabel] ?? ''}`}>
                                  {app.statusLabel}
                                </span>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <button className="admin-applications__toggle" onClick={() => toggleBoothRow(row)}>
                            {isOpen ? '접기 ▲' : '펼치기 ▼'}
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="admin-applications__detail-row">
                          <td colSpan={4}>
                            <div className="admin-applications__detail">
                              {(() => {
                                const selectedApp = row.applicants.find((a) => a.applicationId === selectedApplicationId);
                                const selectedGroup = selectedApp?.group;
                                return (
                                  <div className="admin-applications__detail-col">
                                    <h3>선택된 신청 업체 정보</h3>
                                    {selectedGroup ? (
                                      <dl>
                                        <dt>참가업체 ID</dt>
                                        <dd>#{selectedGroup.exhibitorId}</dd>
                                        <dt>신청 그룹</dt>
                                        <dd>{selectedGroup.groupId}</dd>
                                      </dl>
                                    ) : (
                                      <p className="admin-applications__cell-muted">오른쪽에서 업체를 선택하면 상세 정보가 표시됩니다.</p>
                                    )}

                                    <h3>부스 참가 상세 신청 정보</h3>
                                    {selectedGroup ? (
                                      <dl>
                                        <dt>주요 전시 품목</dt>
                                        <dd>{selectedGroup.exhibitionItem}</dd>
                                        <dt>전시 컨셉 설명</dt>
                                        <dd>{selectedGroup.conceptDescription}</dd>
                                        <dt>추가 요청 사항</dt>
                                        <dd>{selectedGroup.additionalRequest || '-'}</dd>
                                      </dl>
                                    ) : (
                                      <p className="admin-applications__cell-muted">-</p>
                                    )}
                                  </div>
                                );
                              })()}
                              <div className="admin-applications__detail-col">
                                <h3>{row.boothNo} 신청 업체 비교 (업체를 선택해 개별 승인/반려)</h3>
                                <BoothDecisionPanel
                                  applicants={row.applicants}
                                  renderLabel={(app) => `#${app.group.exhibitorId}`}
                                  selectedApplicationId={selectedApplicationId}
                                  onSelect={setSelectedApplicationId}
                                  memo={memo}
                                  setMemo={setMemo}
                                  onApprove={handleApprove}
                                  onReject={handleReject}
                                  isSubmitting={isSubmitting}
                                  actionError={actionError}
                                />
                              </div>
                            </div>
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
      )}
    </div>
  );
}

export default AdminExpoDetail;
