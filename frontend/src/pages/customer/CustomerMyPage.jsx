import { useEffect, useState } from 'react';
import QrPlaceholder from '../../components/customer/QrPlaceholder';
import { getTicketStatus, isTicketCheckableToday, toDisplayTicket } from '../../mock/customerData';
import { getMyReservations } from '../../api/reservation';
import { getCustomerExpoList } from '../../api/expo';
import { downloadTicketImage } from '../../utils/downloadImage';
import '../../components/customer/Modal.css';
import '../../components/customer/EntryFlowModal.css';
import './CustomerMyPage.css';

const TABS = [
  { key: 'profile', label: '내정보' },
  { key: 'tickets', label: '나의 입장권' },
  { key: 'consultations', label: '예약한 상담' },
  { key: 'wishlist', label: '관심 차량' },
  { key: 'settings', label: '설정' },
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

function CustomerMyPage() {
  const [tab, setTab] = useState('tickets');
  const [ticketFilter, setTicketFilter] = useState('전체');
  const [zoomTicket, setZoomTicket] = useState(null);
  const [rawTickets, setRawTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // 실제 Reservation 서비스(GET /api/customer/reservations)에서 내 입장권 목록 조회.
  // 티켓 응답엔 expoId만 있어서, 이름/장소/기간 표시는 실제 Expo 서비스(GET /api/customer/expos)를
  // 같이 조회해 expoId로 매칭해야 함 — 안 그러면 QR이 발급된 실제 박람회와 화면에 뜨는 이름이 어긋난다.
  useEffect(() => {
    Promise.all([getMyReservations(), getCustomerExpoList({ page: 0, size: 100 })])
      .then(([tickets, expoRes]) => {
        const expoMap = new Map(expoRes.content.map((e) => [e.expoId, e]));
        setRawTickets(tickets.map((t) => toDisplayTicket(t, expoMap)));
        setLoadError(null);
      })
      .catch((err) => {
        setLoadError(
          err.response?.data?.error?.message ?? '입장권 목록을 불러오지 못했습니다.'
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const allTickets = rawTickets.map((t) => ({ ...t, _status: getTicketStatus(t) }));
  const tickets =
    ticketFilter === '전체' ? allTickets : allTickets.filter((t) => t._status === ticketFilter);
  const availableCount = allTickets.filter((t) => t._status === '사용가능').length;
  const usedCount = allTickets.filter((t) => t._status === '사용완료').length;
  const expiredCount = allTickets.filter((t) => t._status === '만료').length;
  const filterCount = { 사용가능: availableCount, 사용완료: usedCount, 만료: expiredCount };

  return (
    <div className="c-mypage">
      <div className="c-mypage__crumb">마이페이지</div>
      <h1 className="c-mypage__title">
        {tab === 'tickets' ? '나의 입장권' : TABS.find((t) => t.key === tab)?.label}
      </h1>
      <p className="c-mypage__subtitle">
        {tab === 'tickets'
          ? '구매한 입장권과 QR을 다시 확인할 수 있습니다.'
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
          {tab === 'tickets' ? (
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
                <div className="c-ticket-grid">
                  {tickets.map((t) => (
                    <div key={t.id} className="c-ticket-card">
                      <div className="c-ticket-card__head">
                        <h3>{t.expoTitle}</h3>
                        <span
                          className={`c-ticket-card__badge ${
                            t._status === '사용완료' ? 'is-used' : t._status === '만료' ? 'is-expired' : ''
                          }`}
                        >
                          {t._status}
                        </span>
                      </div>
                      <div className="c-ticket-card__visitdate">
                        <span className="c-ticket-card__visitdate-label">체크인 가능일</span>
                        <span className="c-ticket-card__visitdate-value">{fmtDate(t.visitDate)}</span>
                        {t._status === '사용가능' && isTicketCheckableToday(t) && (
                          <span className="c-ticket-card__visitdate-today">오늘 체크인 가능</span>
                        )}
                      </div>
                      <p className="c-ticket-card__meta">
                        <span className="c-ticket-card__icon c-ticket-card__icon--calendar" />
                        박람회 전체 기간 {fmtDate(t.startsAt)} - {fmtDate(t.endsAt)}
                      </p>
                      <p className="c-ticket-card__meta">
                        <span className="c-ticket-card__icon c-ticket-card__icon--pin" />
                        {t.venue}
                      </p>
                      <div className="c-ticket-card__divider" />
                      <div className="c-ticket-card__row">
                        <div className="c-ticket-card__qr" onClick={() => setZoomTicket(t)}>
                          {t.qrImageBase64 ? (
                            <img
                              src={`data:image/png;base64,${t.qrImageBase64}`}
                              alt="입장 QR 코드"
                              width={64}
                              height={64}
                            />
                          ) : (
                            <QrPlaceholder size={64} />
                          )}
                        </div>
                        <div className="c-ticket-card__info">
                          <p>
                            {t.holderName} <span className="c-ticket-card__dot" /> {t.ticketType}
                          </p>
                          <p className="c-ticket-card__muted">예매번호 {t.bookingNo}</p>
                          <p className="c-ticket-card__muted">구매일 {t.purchasedAt}</p>
                        </div>
                      </div>
                      <div className="c-ticket-card__actions">
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
    </div>
  );
}

export default CustomerMyPage;