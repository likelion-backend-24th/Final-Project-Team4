import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QrPlaceholder from './QrPlaceholder';
import { addMyTicket } from '../../mock/customerData';
import './Modal.css';
import './EntryFlowModal.css';

const DAY_TICKET_FEE = 10000;

const fmtDate = (iso) => (iso ? iso.slice(0, 10).replace(/-/g, '.') : '');

function nowLabel() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildTicket(expo) {
  return {
    id: `${expo.expoId}-${Date.now()}`,
    expoTitle: expo.title,
    startsAt: expo.startsAt,
    endsAt: expo.endsAt,
    venue: expo.venue,
    holderName: '홍길동',
    ticketType: '일반 관람객 · 1인',
    bookingNo: `EX${expo.startsAt.replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    purchasedAt: nowLabel(),
    status: '사용가능',
  };
}

// 박람회 목록에서 "선택하기"를 눌렀을 때 뜨는 입장 방법 선택 팝업 + 이어지는 전체 플로우.
// 실제 백엔드에 "기존 티켓 인증"/"당일 입장권 결제·발급" API가 아직 없어서
// (내 티켓 조회, 결제 연동 모두 미구현 — CLAUDE.md 참고) 전 구간을 화면 확인용 목업으로 구성함.
function EntryFlowModal({ expo, onClose }) {
  const navigate = useNavigate();
  const [step, setStep] = useState('choose');
  const [authTab, setAuthTab] = useState('scan');
  const [bookingCode, setBookingCode] = useState('');
  const [payMethod, setPayMethod] = useState('card');
  const [agree, setAgree] = useState(false);
  const [ticket, setTicket] = useState(null);

  const goDetail = () => {
    onClose();
    navigate(`/customer/expos/${expo.expoId}`);
  };

  const goMyPage = () => {
    onClose();
    navigate('/customer/mypage');
  };

  const goLogin = () => {
    onClose();
    navigate('/login');
  };

  const issueFromExisting = () => {
    const t = buildTicket(expo);
    addMyTicket(t);
    setTicket(t);
    setStep('qr-ready');
  };

  const issueFromPurchase = () => {
    const t = buildTicket(expo);
    addMyTicket(t);
    setTicket(t);
    setStep('ticket-qr');
  };

  return (
    <div className="c-modal__backdrop" onClick={onClose}>
      <div className="c-modal ef-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="c-modal__close" onClick={onClose} aria-label="닫기">
          ✕
        </button>

        {step === 'choose' && (
          <ChooseMethod
            onQrExisting={() => setStep('qr-auth')}
            onBuyTicket={() => setStep('payment')}
            onGuest={() => setStep('guest-info')}
          />
        )}

        {step === 'qr-auth' && (
          <QrAuth
            authTab={authTab}
            setAuthTab={setAuthTab}
            bookingCode={bookingCode}
            setBookingCode={setBookingCode}
            onAuthed={issueFromExisting}
          />
        )}

        {step === 'qr-ready' && ticket && (
          <TicketQr expo={expo} ticket={ticket} onNext={() => setStep('entry-guide')} nextLabel="다음" />
        )}

        {step === 'entry-guide' && <EntryGuide onLookAround={goDetail} onMyPage={goMyPage} />}

        {step === 'payment' && (
          <Payment
            payMethod={payMethod}
            setPayMethod={setPayMethod}
            agree={agree}
            setAgree={setAgree}
            onPaid={() => setStep('pay-done')}
          />
        )}

        {step === 'pay-done' && (
          <PayDone onCheckQr={issueFromPurchase} onLookAround={goDetail} />
        )}

        {step === 'ticket-qr' && ticket && (
          <TicketQr expo={expo} ticket={ticket} onNext={goDetail} nextLabel="박람회 둘러보기" />
        )}

        {step === 'guest-info' && <GuestInfo onLookAround={goDetail} onLogin={goLogin} />}
      </div>
    </div>
  );
}

function ChooseMethod({ onQrExisting, onBuyTicket, onGuest }) {
  return (
    <>
      <div className="c-modal__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" strokeLinecap="round" />
        </svg>
      </div>
      <h2>박람회 입장 방법을 선택해주세요</h2>
      <p className="c-modal__desc">더 빠르고 편리한 관람을 위해 사전 체크인을 진행해 보세요.</p>

      <div className="ef-options">
        <button type="button" className="ef-option" onClick={onQrExisting}>
          <span className="ef-option__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
          </span>
          <span className="ef-option__body">
            <strong>QR 사전 입장</strong>
            <span>이미 구매한 입장권으로 바로 입장</span>
          </span>
          <span className="ef-option__chevron" />
        </button>

        <button type="button" className="ef-option" onClick={onBuyTicket}>
          <span className="ef-option__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M2 10h20" strokeLinecap="round" />
            </svg>
          </span>
          <span className="ef-option__body">
            <strong>당일 입장권 구매</strong>
            <span>입장권을 구매하고 QR 발급</span>
          </span>
          <span className="ef-option__chevron" />
        </button>

        <button type="button" className="ef-option" onClick={onGuest}>
          <span className="ef-option__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </span>
          <span className="ef-option__body">
            <strong>로그인 없이 둘러보기</strong>
            <span>입장권 구매 없이 박람회 정보만 확인</span>
          </span>
          <span className="ef-option__chevron" />
        </button>
      </div>
    </>
  );
}

function QrAuth({ authTab, setAuthTab, bookingCode, setBookingCode, onAuthed }) {
  return (
    <>
      <div className="c-modal__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
      </div>
      <h2>QR 인증하기</h2>
      <p className="c-modal__desc">구매하신 입장권의 정보를 입력해주세요.</p>

      <div className="ef-tabs">
        <button type="button" className={authTab === 'scan' ? 'is-active' : ''} onClick={() => setAuthTab('scan')}>
          QR 코드 스캔
        </button>
        <button type="button" className={authTab === 'code' ? 'is-active' : ''} onClick={() => setAuthTab('code')}>
          예매번호 입력
        </button>
      </div>

      {authTab === 'scan' ? (
        <>
          <div className="ef-scanbox">
            <span className="ef-scanbox__frame" />
          </div>
          <button type="button" className="c-modal__primary" onClick={onAuthed}>
            카메라로 QR 스캔하기
          </button>
          <button type="button" className="ef-link" onClick={() => setAuthTab('code')}>
            예매번호로 인증하기 &gt;
          </button>
        </>
      ) : (
        <>
          <label className="ef-field">
            <span>예매번호</span>
            <input
              placeholder="예: EX20260512-K7H9"
              value={bookingCode}
              onChange={(e) => setBookingCode(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="c-modal__primary"
            disabled={!bookingCode.trim()}
            onClick={onAuthed}
          >
            예매번호로 인증하기
          </button>
          <button type="button" className="ef-link" onClick={() => setAuthTab('scan')}>
            QR 코드로 스캔하기 &gt;
          </button>
        </>
      )}
    </>
  );
}

function TicketQr({ expo, ticket, onNext, nextLabel }) {
  return (
    <>
      <p className="ef-ready-badge">
        <span className="ef-ready-badge__dot" />
        입장 준비 완료!
      </p>
      <p className="c-modal__desc">현장에서 이 QR을 제시해주세요.</p>
      <div className="ef-qr-box">
        <QrPlaceholder size={160} />
      </div>
      <h2 className="ef-qr-title">{expo.title}</h2>
      <p className="ef-qr-sub">
        {ticket.holderName} <span className="ef-qr-dot" /> {ticket.ticketType}
      </p>
      <p className="ef-qr-meta">
        {fmtDate(expo.startsAt)} ~ {fmtDate(expo.endsAt)}
        <br />
        {expo.venue}
      </p>
      <button type="button" className="c-modal__primary" onClick={onNext}>
        {nextLabel}
      </button>
      <button type="button" className="c-modal__secondary" onClick={() => window.print()}>
        이미지 저장하기
      </button>
    </>
  );
}

function EntryGuide({ onLookAround, onMyPage }) {
  return (
    <>
      <div className="c-modal__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5">
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2>사전 체크인이 완료되었습니다!</h2>
      <p className="c-modal__desc">현장에서 QR을 제시하시면 빠르게 입장하실 수 있습니다.</p>
      <ul className="ef-bullets">
        <li>QR은 1인 1회만 사용 가능합니다.</li>
        <li>현장 입구에서 QR을 제시해주세요.</li>
        <li>스크린샷 사용 가능합니다.</li>
      </ul>
      <button type="button" className="c-modal__primary" onClick={onLookAround}>
        박람회 둘러보기
      </button>
      <button type="button" className="c-modal__secondary" onClick={onMyPage}>
        마이페이지에서 다시 보기
      </button>
    </>
  );
}

const PAY_METHODS = [
  { key: 'card', label: '신용카드' },
  { key: 'transfer', label: '실시간 계좌이체' },
  { key: 'virtual', label: '가상계좌 발급' },
];

function Payment({ payMethod, setPayMethod, agree, setAgree, onPaid }) {
  const canPay = payMethod === 'card' && agree;

  return (
    <>
      <h2 className="ef-left">결제 수단 선택</h2>
      <p className="c-modal__desc ef-left">원하는 결제 수단을 선택합니다.</p>

      <div className="ef-tabs">
        {PAY_METHODS.map((m) => (
          <button
            key={m.key}
            type="button"
            className={payMethod === m.key ? 'is-active' : ''}
            onClick={() => setPayMethod(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {payMethod === 'card' ? (
        <div className="ef-card-form">
          <p className="ef-card-form__title">당일 입장권 결제</p>
          <label className="ef-field">
            <span>카드 번호</span>
            <input placeholder="1234 - 5678 - 9012 - 3456" />
          </label>
          <div className="ef-field-row">
            <label className="ef-field">
              <span>유효기간(MM/YY)</span>
              <input placeholder="MM / YY" />
            </label>
            <label className="ef-field">
              <span>CVC 번호</span>
              <input placeholder="123" />
            </label>
          </div>
          <label className="ef-field">
            <span>카드소유주</span>
            <input placeholder="이름을 입력하세요." />
          </label>
          <label className="ef-checkbox-row">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>
              결제 내용을 확인하였으며, 이에 동의합니다. (필수)
              <br />
              <a href="#!" onClick={(e) => e.preventDefault()}>
                이용약관 보기
              </a>
            </span>
          </label>
        </div>
      ) : (
        <p className="ef-placeholder">이 결제 수단은 준비 중입니다.</p>
      )}

      <button type="button" className="c-modal__primary" disabled={!canPay} onClick={onPaid}>
        ₩{DAY_TICKET_FEE.toLocaleString()} 결제하기
      </button>
    </>
  );
}

function PayDone({ onCheckQr, onLookAround }) {
  return (
    <>
      <div className="c-modal__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5">
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2>결제가 완료되었습니다!</h2>
      <p className="c-modal__desc">입장용 QR이 발급되었습니다.</p>
      <dl className="c-modal__info">
        <div className="c-modal__info-row">
          <dt>결제 일시</dt>
          <dd>{nowLabel()}</dd>
        </div>
        <div className="c-modal__info-row">
          <dt>결제 수단</dt>
          <dd>신용카드</dd>
        </div>
        <div className="c-modal__info-row">
          <dt>결제 금액</dt>
          <dd>₩{DAY_TICKET_FEE.toLocaleString()}</dd>
        </div>
      </dl>
      <button type="button" className="c-modal__primary" onClick={onCheckQr}>
        QR 확인하기
      </button>
      <button type="button" className="c-modal__secondary" onClick={onLookAround}>
        박람회 둘러보기
      </button>
    </>
  );
}

function GuestInfo({ onLookAround, onLogin }) {
  return (
    <>
      <div className="c-modal__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </div>
      <h2>박람회 정보를 둘러볼까요?</h2>
      <p className="c-modal__desc">로그인 없이도 참가업체, 차량 정보를 확인할 수 있습니다.</p>
      <ul className="ef-bullets">
        <li>차량 상세 정보, 부스 위치 확인 가능</li>
        <li>상담 신청을 원하시면 로그인 후 이용해주세요.</li>
        <li>입장권은 현장에서 구매할 수 있습니다.</li>
      </ul>
      <button type="button" className="c-modal__primary" onClick={onLookAround}>
        박람회 둘러보기
      </button>
      <button type="button" className="c-modal__secondary" onClick={onLogin}>
        로그인하고 더 많은 기능 이용하기
      </button>
    </>
  );
}

export default EntryFlowModal;
