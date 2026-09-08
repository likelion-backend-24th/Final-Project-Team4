import { useState } from 'react';
import QrPlaceholder from '../../components/customer/QrPlaceholder';
import { getMyTickets } from '../../mock/customerData';
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

const fmtDate = (iso) => (iso ? iso.slice(0, 10).replace(/-/g, '.') : '');

function CustomerMyPage() {
  const [tab, setTab] = useState('tickets');
  const [zoomTicket, setZoomTicket] = useState(null);

  const tickets = getMyTickets();

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
            tickets.length === 0 ? (
              <p className="c-mypage__empty">아직 발급된 입장권이 없습니다.</p>
            ) : (
              <div className="c-ticket-grid">
                {tickets.map((t) => (
                  <div key={t.id} className="c-ticket-card">
                    <div className="c-ticket-card__head">
                      <h3>{t.expoTitle}</h3>
                      <span
                        className={`c-ticket-card__badge ${t.status === '사용완료' ? 'is-used' : ''}`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <p className="c-ticket-card__meta">
                      <span className="c-ticket-card__icon c-ticket-card__icon--calendar" />
                      {fmtDate(t.startsAt)} - {fmtDate(t.endsAt)}
                    </p>
                    <p className="c-ticket-card__meta">
                      <span className="c-ticket-card__icon c-ticket-card__icon--pin" />
                      {t.venue}
                    </p>
                    <div className="c-ticket-card__divider" />
                    <div className="c-ticket-card__row">
                      <div className="c-ticket-card__qr" onClick={() => setZoomTicket(t)}>
                        <QrPlaceholder size={64} />
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
                      <button type="button" onClick={() => window.print()}>
                        이미지 저장
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
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
              <QrPlaceholder size={200} />
            </div>
            <p className="c-mypage__zoom-meta">예매번호 {zoomTicket.bookingNo}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerMyPage;
