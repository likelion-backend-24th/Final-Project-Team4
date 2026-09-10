import { useEffect, useMemo, useState } from 'react';
import { approveConsultation, getBoothVehicles, getExhibitorConsultations, getMyBoothApplications, rejectConsultation } from '../api/expo';
import './ConsultationRequests.css';

const STATUS_LABEL = { REQUESTED: '승인 대기', APPROVED: '승인', REJECTED: '반려' };
const STATUS_BADGE = { REQUESTED: 'crm-badge--pending', APPROVED: 'crm-badge--approved', REJECTED: 'crm-badge--rejected' };
const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

// VehicleDetail.jsx가 상담 신청 시 message에 "이름/연락처/이메일/요청사항"을 함께 담아 보낸다
// (백엔드 consultations 스키마엔 별도 컬럼이 없어서) - 여기서 다시 파싱해 화면에 나눠 보여준다.
function parseMessage(message) {
  if (!message) return { name: null, phone: null, email: null, extra: null };
  const pick = (label) => message.match(new RegExp(`${label}:\\s*(.+)`))?.[1]?.trim() ?? null;
  return {
    name: pick('이름'),
    phone: pick('연락처'),
    email: pick('이메일'),
    extra: message.match(/요청사항:\s*([\s\S]*)/)?.[1]?.trim() ?? null,
  };
}

// ISO(2026-05-12T10:00:00) → 화면 표시용(2026.05.12 10:00)
const fmtDateTime = (iso) => (iso ? iso.slice(0, 16).replace('T', ' ').replace(/-/g, '.') : '-');
// 'YYYY-MM-DD' → 'MM/DD'
const fmtShortDate = (dateStr) => (dateStr ? dateStr.slice(5).replace('-', '/') : '-');

function visitDateCategory(dateStr) {
  const target = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target - today) / 86400000);
  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '내일';
  if (diffDays >= 0 && diffDays <= 6) return '이번 주';
  return null;
}

const PAGE_SIZE = 10;

// 참가업체 - 본인 부스로 들어온 차량 구매/시승 상담 신청 조회·승인·반려 (TASK 6-3)
function ConsultationRequests() {
  const [consultations, setConsultations] = useState([]);
  const [boothInfoMap, setBoothInfoMap] = useState({}); // boothId -> { expoTitle, boothNo }
  const [vehicleNameMap, setVehicleNameMap] = useState({}); // vehicleId -> name
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [filterExpo, setFilterExpo] = useState('전체 박람회');
  const [filterStatus, setFilterStatus] = useState('전체 상태');
  const [filterType, setFilterType] = useState('전체 상담 유형');
  const [filterVisitDate, setFilterVisitDate] = useState('전체 방문일');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const [selectedId, setSelectedId] = useState(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

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

  // 화면에 필요한 형태로 가공: 박람회/부스/차량명 붙이고, message에서 고객 연락처를 뽑아낸다.
  const rows = useMemo(
    () =>
      consultations.map((c) => {
        const boothInfo = boothInfoMap[c.boothId];
        const contact = parseMessage(c.message);
        const typeLabel = [c.wantsPurchase && '구매', c.wantsTestDrive && '시승'].filter(Boolean).join(' + ');
        return {
          ...c,
          expoTitle: boothInfo?.expoTitle ?? '박람회 정보 확인 중...',
          boothNo: boothInfo?.boothNo ?? `부스 #${c.boothId}`,
          vehicleName: vehicleNameMap[c.vehicleId] ?? `차량 #${c.vehicleId}`,
          customerName: contact.name,
          customerPhone: contact.phone,
          customerEmail: contact.email,
          extraMessage: contact.extra,
          typeLabel,
          statusLabel: STATUS_LABEL[c.status] ?? c.status,
        };
      }),
    [consultations, boothInfoMap, vehicleNameMap]
  );

  const expoOptions = useMemo(() => ['전체 박람회', ...new Set(rows.map((r) => r.expoTitle))], [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterExpo !== '전체 박람회' && r.expoTitle !== filterExpo) return false;
      if (filterStatus !== '전체 상태' && r.statusLabel !== filterStatus) return false;
      if (filterType !== '전체 상담 유형' && r.typeLabel !== filterType) return false;
      if (filterVisitDate !== '전체 방문일' && visitDateCategory(r.preferredDate) !== filterVisitDate) return false;
      if (q) {
        const haystack = `${r.customerName ?? ''} ${r.customerPhone ?? ''} ${r.vehicleName}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filterExpo, filterStatus, filterType, filterVisitDate, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  const setFilterAndResetPage = (setter) => (e) => {
    setter(e.target.value);
    setPage(0);
  };

  const stats = useMemo(
    () => ({
      total: rows.length,
      pending: rows.filter((r) => r.status === 'REQUESTED').length,
      approved: rows.filter((r) => r.status === 'APPROVED').length,
      today: rows.filter((r) => r.status === 'APPROVED' && visitDateCategory(r.preferredDate) === '오늘').length,
    }),
    [rows]
  );

  const selected = rows.find((r) => r.consultationId === selectedId) ?? null;

  const openDrawer = (row) => {
    setSelectedId(row.consultationId);
    setIsRejecting(false);
    setRejectReason('');
    setActionError(null);
  };

  const closeDrawer = () => {
    setSelectedId(null);
    setIsRejecting(false);
    setRejectReason('');
  };

  const handleApprove = (row) => {
    const confirmed = window.confirm(`${row.expoTitle} / ${row.boothNo} - ${row.vehicleName}\n${row.typeLabel} 상담 신청을 승인할까요?`);
    if (!confirmed) return;

    setSubmitting(true);
    setActionError(null);
    approveConsultation(row.consultationId)
      .then(() => {
        closeDrawer();
        load();
      })
      .catch((err) => setActionError(err.response?.data?.error?.message ?? '승인 처리 중 오류가 발생했습니다.'))
      .finally(() => setSubmitting(false));
  };

  const handleReject = (row) => {
    if (!rejectReason.trim()) return;
    setSubmitting(true);
    setActionError(null);
    rejectConsultation(row.consultationId, rejectReason.trim())
      .then(() => {
        closeDrawer();
        load();
      })
      .catch((err) => setActionError(err.response?.data?.error?.message ?? '반려 처리 중 오류가 발생했습니다.'))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="crm">
      <section className="crm-hero">
        <div className="crm-hero__eyebrow">EXHIBITOR MANAGEMENT PORTAL</div>
        <h1>상담 관리</h1>
        <p>참가한 박람회의 상담 신청을 확인하고 고객 상담 일정을 관리할 수 있습니다.</p>
      </section>

      <main className="crm-container">
        <section className="crm-stats">
          <div className="crm-stat">
            <div className="crm-stat__label">전체 상담 신청</div>
            <div className="crm-stat__value">{stats.total}<small>건</small></div>
          </div>
          <div className="crm-stat">
            <div className="crm-stat__label">승인 대기</div>
            <div className="crm-stat__value">{stats.pending}<small>건</small></div>
          </div>
          <div className="crm-stat">
            <div className="crm-stat__label">승인 완료</div>
            <div className="crm-stat__value">{stats.approved}<small>건</small></div>
          </div>
          <div className="crm-stat">
            <div className="crm-stat__label">오늘 방문 예정</div>
            <div className="crm-stat__value">{stats.today}<small>건</small></div>
          </div>
        </section>

        <section className="crm-toolbar">
          <select value={filterExpo} onChange={setFilterAndResetPage(setFilterExpo)}>
            {expoOptions.map((v) => <option key={v}>{v}</option>)}
          </select>
          <select value={filterStatus} onChange={setFilterAndResetPage(setFilterStatus)}>
            {['전체 상태', '승인 대기', '승인', '반려'].map((v) => <option key={v}>{v}</option>)}
          </select>
          <select value={filterType} onChange={setFilterAndResetPage(setFilterType)}>
            {['전체 상담 유형', '구매', '시승', '구매 + 시승'].map((v) => <option key={v}>{v}</option>)}
          </select>
          <select value={filterVisitDate} onChange={setFilterAndResetPage(setFilterVisitDate)}>
            {['전체 방문일', '오늘', '내일', '이번 주'].map((v) => <option key={v}>{v}</option>)}
          </select>
          <input
            className="crm-search"
            placeholder="고객명 / 연락처 / 차량 검색"
            value={search}
            onChange={setFilterAndResetPage(setSearch)}
          />
        </section>

        {actionError && <p className="crm-error">{actionError}</p>}
        {loadError && <p className="crm-error">{loadError}</p>}

        <section className="crm-content">
          <div className="crm-content__head">
            <div className="crm-content__title">상담 신청 <span>{filtered.length}</span>건</div>
          </div>

          <div className="crm-table-scroll">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>고객</th>
                  <th>박람회</th>
                  <th>차량</th>
                  <th>상담 유형</th>
                  <th>희망 방문일</th>
                  <th>신청일</th>
                  <th>상태</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={8} className="crm-empty-cell">불러오는 중...</td></tr>
                )}
                {!loading && pageItems.length === 0 && (
                  <tr><td colSpan={8} className="crm-empty-cell">조건에 맞는 상담 신청이 없습니다.</td></tr>
                )}
                {pageItems.map((row) => (
                  <tr key={row.consultationId} onClick={() => openDrawer(row)}>
                    <td>
                      <span className="crm-customer">{row.customerName ?? `고객 #${row.customerId}`}</span>
                      <span className="crm-sub">{row.customerPhone ?? '-'}</span>
                    </td>
                    <td>
                      <span className="crm-expo">{row.expoTitle}</span>
                      <span className="crm-sub">{row.boothNo}</span>
                    </td>
                    <td><span className="crm-vehicle">{row.vehicleName}</span></td>
                    <td>
                      <div className="crm-type-badges">
                        {row.wantsPurchase && <span className="crm-badge crm-badge--purchase">구매</span>}
                        {row.wantsTestDrive && <span className="crm-badge crm-badge--drive">시승</span>}
                      </div>
                    </td>
                    <td className="crm-date">
                      <strong>{fmtShortDate(row.preferredDate)} {row.preferredTime?.slice(0, 5)}</strong>
                      <span>{WEEKDAYS[new Date(`${row.preferredDate}T00:00:00`).getDay()]}</span>
                    </td>
                    <td>{fmtDateTime(row.createdAt)}</td>
                    <td><span className={`crm-badge ${STATUS_BADGE[row.status] ?? ''}`}>{row.statusLabel}</span></td>
                    <td>
                      <button type="button" className="crm-action" onClick={(e) => { e.stopPropagation(); openDrawer(row); }}>
                        상세보기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="crm-pagination">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  className={`crm-page ${currentPage === i ? 'is-active' : ''}`}
                  onClick={() => setPage(i)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </section>
      </main>

      {selected && (
        <>
          <div className="crm-drawer-backdrop" onClick={closeDrawer} />
          <aside className="crm-drawer">
            <div className="crm-drawer__head">
              <div>
                <h2>{selected.customerName ?? `고객 #${selected.customerId}`}</h2>
                <p>{selected.customerPhone ?? '-'} · {selected.customerEmail ?? '-'}</p>
              </div>
              <button type="button" className="crm-drawer__close" onClick={closeDrawer} aria-label="닫기">×</button>
            </div>

            <div className="crm-drawer__body">
              <section className="crm-detail-section">
                <div className="crm-detail-title">상담 정보</div>
                <div className="crm-detail-box">
                  <div className="crm-detail-row"><span className="crm-label">박람회</span><span className="crm-value">{selected.expoTitle}</span></div>
                  <div className="crm-detail-row"><span className="crm-label">부스</span><span className="crm-value">{selected.boothNo}</span></div>
                  <div className="crm-detail-row"><span className="crm-label">차량</span><span className="crm-value">{selected.vehicleName}</span></div>
                  <div className="crm-detail-row"><span className="crm-label">상담 유형</span><span className="crm-value">{selected.typeLabel}</span></div>
                  <div className="crm-detail-row">
                    <span className="crm-label">희망 방문일</span>
                    <span className="crm-value">
                      {selected.preferredDate} {selected.preferredTime?.slice(0, 5)} ({WEEKDAYS[new Date(`${selected.preferredDate}T00:00:00`).getDay()]})
                    </span>
                  </div>
                </div>
              </section>

              <section className="crm-detail-section">
                <div className="crm-detail-title">고객 정보</div>
                <div className="crm-detail-box">
                  <div className="crm-detail-row"><span className="crm-label">이름</span><span className="crm-value">{selected.customerName ?? '-'}</span></div>
                  <div className="crm-detail-row"><span className="crm-label">연락처</span><span className="crm-value">{selected.customerPhone ?? '-'}</span></div>
                  <div className="crm-detail-row"><span className="crm-label">이메일</span><span className="crm-value">{selected.customerEmail ?? '-'}</span></div>
                </div>
              </section>

              <section className="crm-detail-section">
                <div className="crm-detail-title">추가 문의사항</div>
                <div className="crm-detail-box">
                  <p className="crm-message">{selected.extraMessage || '-'}</p>
                </div>
              </section>

              {selected.status === 'REJECTED' && (
                <section className="crm-detail-section">
                  <div className="crm-detail-title">반려 사유</div>
                  <div className="crm-detail-box">
                    <p className="crm-message">{selected.rejectReason}</p>
                  </div>
                </section>
              )}
            </div>

            <div className="crm-drawer__actions">
              {selected.status !== 'REQUESTED' ? (
                <p className="crm-drawer__done-note">이미 처리된 신청입니다.</p>
              ) : isRejecting ? (
                <div className="crm-reject-inline">
                  <input
                    className="crm-reject-inline__input"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="반려 사유를 입력하세요 (필수)"
                    autoFocus
                  />
                  <div className="crm-reject-inline__buttons">
                    <button type="button" className="crm-btn crm-btn--cancel" onClick={() => setIsRejecting(false)}>
                      취소
                    </button>
                    <button
                      type="button"
                      className="crm-btn crm-btn--reject-confirm"
                      disabled={!rejectReason.trim() || submitting}
                      onClick={() => handleReject(selected)}
                    >
                      반려 확정
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button type="button" className="crm-btn crm-btn--reject" disabled={submitting} onClick={() => setIsRejecting(true)}>
                    반려
                  </button>
                  <button type="button" className="crm-btn crm-btn--approve" disabled={submitting} onClick={() => handleApprove(selected)}>
                    승인
                  </button>
                </>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

export default ConsultationRequests;
