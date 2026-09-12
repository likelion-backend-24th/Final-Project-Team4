import { useEffect, useMemo, useState } from 'react';
import QrPlaceholder from '../../components/customer/QrPlaceholder';
import ConsultationDetailModal from '../../components/customer/ConsultationDetailModal';
import { getTicketStatus, isTicketCheckableToday, toDisplayTicket } from '../../mock/customerData';
import { getMyReservations } from '../../api/reservation';
import { getCustomerExpoList, getMyConsultations } from '../../api/expo';
import { getMyProfile } from '../../api/identity';
import { downloadTicketImage } from '../../utils/downloadImage';
import '../../components/customer/Modal.css';
import '../../components/customer/EntryFlowModal.css';
import './CustomerMyPage.css';

const TABS = [
  { key: 'profile', label: '내정보' },
  { key: 'tickets', label: '나의 입장권' },
  { key: 'consultations', label: '예약한 상담' },
];

// 상태는 저장된 값이 아니라 매번 계산(getTicketStatus)
// 사용완료 = 입장 체크(체크인)를 마침, 만료 = 체크인 없이 박람회 기간만 끝남
const TICKET_FILTERS = [
  { key: '전체', label: '전체' },
  { key: '사용가능', label: '사용가능' },
  { key: '사용완료', label: '사용완료' },
  { key: '만료', label: '만료' },
];

const fmtDate = (iso) => (iso ? iso.slice(0, 10).replace(/-/g, '.') : '');
const fmtDateTime = (iso) => (iso ? iso.slice(0, 16).replace('T', ' ').replace(/-/g, '.') : '');

const CONSULTATION_STATUS_LABEL = {
  REQUESTED: '대기',
  APPROVED: '승인',
  REJECTED: '반려',
  CANCELED: '취소함',
  COMPLETED: '상담 완료',
  NO_SHOW: '미방문',
};
const CONSULTATION_STATUS_BADGE = {
  REQUESTED: 'is-pending',
  APPROVED: 'is-approved',
  REJECTED: 'is-rejected',
  CANCELED: 'is-rejected',
  COMPLETED: 'is-approved',
  NO_SHOW: 'is-rejected',
};
const CONSULTATION_FILTERS = [
  { key: '전체', label: '전체' },
  { key: '대기', label: '대기' },
  { key: '승인', label: '승인' },
  { key: '반려', label: '반려' },
  { key: '취소함', label: '취소함' },
  { key: '상담 완료', label: '상담 완료' },
  { key: '미방문', label: '미방문' },
];
const consultationTypeLabel = (c) => [c.wantsPurchase && '구매', c.wantsTestDrive && '시승'].filter(Boolean).join(' + ');

function CustomerMyPage() {
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [ticketFilter, setTicketFilter] = useState('전체');
  const [consultFilter, setConsultFilter] = useState('전체');
  const [zoomTicket, setZoomTicket] = useState(null);
  const [apiTickets, setApiTickets] = useState([]);
  const [expoMap, setExpoMap] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [consultations, setConsultations] = useState([]);
  const [consultLoading, setConsultLoading] = useState(true);
  const [consultError, setConsultError] = useState(null);
  const [selectedConsultation, setSelectedConsultation] = useState(null);

  // 실제 Reservation 서비스(GET /api/customer/reservations)에서 내 입장권 목록 조회.
  // 티켓 응답엔 expoId만 있어서, 이름/장소/기간 표시는 실제 Expo 서비스(GET /api/customer/expos)를
  // 같이 조회해 expoId로 매칭해야 함 — 안 그러면 QR이 발급된 실제 박람회와 화면에 뜨는 이름이 어긋난다.
  useEffect(() => {
    Promise.all([getMyReservations(), getCustomerExpoList({ page: 0, size: 100 })])
      .then(([tickets, expoRes]) => {
        setApiTickets(tickets);
        setExpoMap(new Map(expoRes.content.map((e) => [e.expoId, e])));
        setLoadError(null);
      })
      .catch((err) => {
        setLoadError(
          err.response?.data?.error?.message ?? '입장권 목록을 불러오지 못했습니다.'
        );
      })
      .finally(() => setLoading(false));
  }, []);

  // 티켓 표시용 홀더명은 로그인한 본인 이름(profile.name)을 써야 함 — QR/티켓 카드에
  // 실제 발급받은 사람이 아닌 고정값이 보이면 안 되므로 profile 로딩 완료 후에 채워 넣는다.
  const rawTickets = useMemo(
    () => apiTickets.map((t) => toDisplayTicket(t, expoMap, profile?.name)),
    [apiTickets, expoMap, profile]
  );

  useEffect(() => {
    getMyProfile()
      .then((data) => {
        setProfile(data);
        setProfileError(null);
      })
      .catch((err) =>
        setProfileError(err.response?.data?.error?.message ?? '내 정보를 불러오지 못했습니다.')
      );
  }, []);

  const loadConsultations = () =>
    getMyConsultations()
      .then((data) => {
        setConsultations(data);
        setConsultError(null);
      })
      .catch((err) =>
        setConsultError(err.response?.data?.error?.message ?? '상담 신청 내역을 불러오지 못했습니다.')
      )
      .finally(() => setConsultLoading(false));

  useEffect(() => {
    loadConsultations();
  }, []);

  const allTickets = rawTickets.map((t) => ({ ...t, _status: getTicketStatus(t) }));
  const tickets =
    ticketFilter === '전체' ? allTickets : allTickets.filter((t) => t._status === ticketFilter);
  const availableCount = allTickets.filter((t) => t._status === '사용가능').length;
  const usedCount = allTickets.filter((t) => t._status === '사용완료').length;
  const expiredCount = allTickets.filter((t) => t._status === '만료').length;
  const filterCount = { 사용가능: availableCount, 사용완료: usedCount, 만료: expiredCount };

  // 같은 박람회에 여러 날짜로 신청하면 박람회명/기간/장소가 카드마다 반복되던 걸 방지하기 위해
  // expoId 기준으로 묶는다. "오늘 체크인 가능한 QR"이 있는 박람회를 맨 위로 올려서
  // 현장에서 QR을 찾으러 스크롤하지 않아도 되게 함.
  const groupedTickets = useMemo(() => {
    const groups = new Map();
    tickets.forEach((t) => {
      if (!groups.has(t.expoId)) {
        groups.set(t.expoId, {
          expoId: t.expoId,
          expoTitle: t.expoTitle,
          startsAt: t.startsAt,
          endsAt: t.endsAt,
          venue: t.venue,
          items: [],
        });
      }
      groups.get(t.expoId).items.push(t);
    });

    return Array.from(groups.values())
      .map((g) => ({
        ...g,
        items: g.items.sort((a, b) => (a.visitDate ?? '').localeCompare(b.visitDate ?? '')),
        hasToday: g.items.some((t) => t._status === '사용가능' && isTicketCheckableToday(t)),
      }))
      .sort((a, b) => {
        if (a.hasToday !== b.hasToday) return a.hasToday ? -1 : 1;
        return (a.items[0]?.visitDate ?? '').localeCompare(b.items[0]?.visitDate ?? '');
      });
  }, [tickets]);

  const consultationsWithLabel = consultations.map((c) => ({ ...c, _statusLabel: CONSULTATION_STATUS_LABEL[c.status] ?? c.status }));
  const filteredConsultations =
    consultFilter === '전체' ? consultationsWithLabel : consultationsWithLabel.filter((c) => c._statusLabel === consultFilter);
  const consultFilterCount = {
    대기: consultationsWithLabel.filter((c) => c._statusLabel === '대기').length,
    승인: consultationsWithLabel.filter((c) => c._statusLabel === '승인').length,
    반려: consultationsWithLabel.filter((c) => c._statusLabel === '반려').length,
    취소함: consultationsWithLabel.filter((c) => c._statusLabel === '취소함').length,
    '상담 완료': consultationsWithLabel.filter((c) => c._statusLabel === '상담 완료').length,
    미방문: consultationsWithLabel.filter((c) => c._statusLabel === '미방문').length,
  };

  return (
    <div className="c-mypage">
      <div className="c-mypage__crumb">마이페이지</div>
      <h1 className="c-mypage__title">
        {tab === 'tickets' ? '나의 입장권' : TABS.find((t) => t.key === tab)?.label}
      </h1>
      <p className="c-mypage__subtitle">
        {tab === 'tickets'
          ? '구매한 입장권과 QR을 다시 확인할 수 있습니다.'
          : tab === 'profile'
          ? '회원가입 시 등록한 내 기본 정보입니다.'
          : '내 정보와 활동 내역을 확인할 수 있습니다.'}
      </p>
      <div className="c-mypage__body">
        <aside className="c-mypage__side">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={t.key === tab ? 'is-active' : ''}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </aside>
        <main className="c-mypage__main">
          {tab === 'profile' ? (
            <div className="c-mypage__card">
              {profileError ? (
                <p className="c-mypage__empty">{profileError}</p>
              ) : !profile ? (
                <p className="c-mypage__empty">불러오는 중...</p>
              ) : (
                <div className="c-mypage__profile-grid">
                  <div className="c-mypage__profile-row">
                    <span className="c-mypage__profile-label">이름</span>
                    <span className="c-mypage__profile-value">{profile.name ?? '-'}</span>
                  </div>
                  <div className="c-mypage__profile-row">
                    <span className="c-mypage__profile-label">이메일 주소</span>
                    <span className="c-mypage__profile-value">{profile.email ?? '-'}</span>
                  </div>
                  <div className="c-mypage__profile-row">
                    <span className="c-mypage__profile-label">휴대폰 번호</span>
                    <span className="c-mypage__profile-value">{profile.contact ?? '-'}</span>
                  </div>
                </div>
              )}
            </div>
          ) : tab === 'tickets' ? (
            <>
              <div className="c-mypage__ticket-filters">
                {TICKET_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    className={f.key === ticketFilter ? 'is-active' : ''}
                    onClick={() => setTicketFilter(f.key)}
                  >
                    {f.label}
                    {f.key !== '전체' && ` (${filterCount[f.key]})`}
                  </button>
                ))}
              </div>
              {loading ? (
                <p className="c-mypage__empty">불러오는 중...</p>
              ) : loadError ? (
                <p className="c-mypage__empty">{loadError}</p>
              ) : tickets.length === 0 ? (
                <p className="c-mypage__empty">
                  {ticketFilter === '전체'
                    ? '아직 발급된 입장권이 없습니다.'
                    : `${ticketFilter} 상태인 입장권이 없습니다.`}
                </p>
              ) : (
                <div className="c-ticket-groups">
                  {groupedTickets.map((g) => (
                    <div key={g.expoId} className={`c-ticket-group ${g.hasToday ? 'has-today' : ''}`}>
                      <div className="c-ticket-group__head">
                        <div>
                          <h3>{g.expoTitle}</h3>
                          <p className="c-ticket-card__meta">
                            <span className="c-ticket-card__icon c-ticket-card__icon--calendar" />
                            박람회 전체 기간 {fmtDate(g.startsAt)} - {fmtDate(g.endsAt)}
                          </p>
                          <p className="c-ticket-card__meta">
                            <span className="c-ticket-card__icon c-ticket-card__icon--pin" />
                            {g.venue}
                          </p>
                        </div>
                        {g.hasToday && (
                          <span className="c-ticket-group__today-badge">오늘 체크인 가능한 QR 있음</span>
                        )}
                      </div>
                      <div className="c-ticket-group__dates">
                        {g.items.map((t) => {
                          const todayCheckable = t._status === '사용가능' && isTicketCheckableToday(t);
                          return (
                            <div
                              key={t.id}
                              className={`c-ticket-date-row ${todayCheckable ? 'is-today' : ''}`}
                            >
                              <div className="c-ticket-date-row__qr" onClick={() => setZoomTicket(t)}>
                                {t.qrImageBase64 ? (
                                  <img
                                    src={`data:image/png;base64,${t.qrImageBase64}`}
                                    alt="입장 QR 코드"
                                    width={56}
                                    height={56}
                                  />
                                ) : (
                                  <QrPlaceholder size={56} />
                                )}
                              </div>
                              <div className="c-ticket-date-row__info">
                                <div className="c-ticket-date-row__top">
                                  <span className="c-ticket-date-row__date">{fmtDate(t.visitDate)}</span>
                                  <span
                                    className={`c-ticket-card__badge ${
                                      t._status === '사용완료' ? 'is-used' : t._status === '만료' ? 'is-expired' : ''
                                    }`}
                                  >
                                    {t._status}
                                  </span>
                                  {todayCheckable && (
                                    <span className="c-ticket-card__visitdate-today">오늘 체크인 가능</span>
                                  )}
                                </div>
                                <p className="c-ticket-card__muted">
                                  {t.holderName} <span className="c-ticket-card__dot" /> {t.ticketType}
                                </p>
                                <p className="c-ticket-card__muted">
                                  예매번호 {t.bookingNo} · 구매일 {t.purchasedAt}
                                </p>
                              </div>
                              <div className="c-ticket-date-row__actions">
                                <button type="button" onClick={() => setZoomTicket(t)}>
                                  QR 크게 보기
                                </button>
                                <button
                                  type="button"
                                  onClick={() => downloadTicketImage(t, `QR_${t.bookingNo}`)}
                                >
                                  이미지 저장
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : tab === 'consultations' ? (
            <>
              <div className="c-mypage__ticket-filters">
                {CONSULTATION_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    className={f.key === consultFilter ? 'is-active' : ''}
                    onClick={() => setConsultFilter(f.key)}
                  >
                    {f.label}
                    {f.key !== '전체' && ` (${consultFilterCount[f.key]})`}
                  </button>
                ))}
              </div>
              {consultLoading ? (
                <p className="c-mypage__empty">불러오는 중...</p>
              ) : consultError ? (
                <p className="c-mypage__empty">{consultError}</p>
              ) : filteredConsultations.length === 0 ? (
                <p className="c-mypage__empty">
                  {consultFilter === '전체'
                    ? '아직 신청한 상담이 없습니다.'
                    : `${consultFilter} 상태인 상담이 없습니다.`}
                </p>
              ) : (
              <div className="c-ticket-grid">
                {filteredConsultations.map((c) => (
                  <button
                    type="button"
                    key={c.consultationId}
                    className={`c-ticket-card c-consult-card ${c.status === 'REJECTED' ? 'c-ticket-card--rejected' : ''}`}
                    onClick={() => setSelectedConsultation(c)}
                  >
                    <div className="c-ticket-card__head">
                      <div>
                        <h3>{c.interestedVehicle || '차량 정보 없음'}</h3>
                        <p className="c-ticket-card__submeta">
                          {c.expoTitle}
                          {c.boothNo && ` · ${c.boothNo} 부스`}
                        </p>
                      </div>
                      <span className={`c-ticket-card__badge ${CONSULTATION_STATUS_BADGE[c.status] ?? ''}`}>
                        {CONSULTATION_STATUS_LABEL[c.status] ?? c.status}
                      </span>
                    </div>
                    <p className="c-ticket-card__meta">{consultationTypeLabel(c)} 상담</p>
                    <p className="c-ticket-card__meta">
                      <span className="c-ticket-card__icon c-ticket-card__icon--calendar" />
                      희망 일시 {c.preferredDate} {c.preferredTime?.slice(0, 5)}
                    </p>
                    <p className="c-ticket-card__meta">신청일 {fmtDateTime(c.createdAt)}</p>
                    <p className="c-ticket-card__meta">이름: {c.customerName ?? '-'}</p>
                    <p className="c-ticket-card__meta">연락처: {c.customerPhone ?? '-'}</p>
                    <p className="c-ticket-card__meta">이메일: {c.customerEmail ?? '-'}</p>
                  </button>
                ))}
              </div>
              )}
            </>
          ) : (
            <p className="c-mypage__empty">준비 중인 화면입니다.</p>
          )}
        </main>
      </div>
      {zoomTicket && (
        <div className="c-modal__backdrop" onClick={() => setZoomTicket(null)}>
          <div className="c-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="c-modal__close"
              onClick={() => setZoomTicket(null)}
              aria-label="닫기"
            >
              ✕
            </button>
            <h2>{zoomTicket.expoTitle}</h2>
            <div className="ef-qr-box" style={{ margin: '16px auto' }}>
              {zoomTicket.qrImageBase64 ? (
                <img
                  src={`data:image/png;base64,${zoomTicket.qrImageBase64}`}
                  alt="입장 QR 코드"
                  width={200}
                  height={200}
                />
              ) : (
                <QrPlaceholder size={200} />
              )}
            </div>
            <p className="c-mypage__zoom-meta">체크인 가능일 {fmtDate(zoomTicket.visitDate)}</p>
            <p className="c-mypage__zoom-meta">예매번호 {zoomTicket.bookingNo}</p>
            <button
              type="button"
              className="c-modal__secondary"
              style={{ marginTop: 12 }}
              onClick={() => downloadTicketImage(zoomTicket, `QR_${zoomTicket.bookingNo}`)}
            >
              이미지 저장
            </button>
          </div>
        </div>
      )}
      {selectedConsultation && (
        <ConsultationDetailModal
          consultation={selectedConsultation}
          onClose={() => setSelectedConsultation(null)}
          onChanged={loadConsultations}
        />
      )}
    </div>
  );
}

export default CustomerMyPage;