import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QrPlaceholder from './QrPlaceholder';
import { addMyTicket, getTicketStatus, isTicketCheckableToday } from '../../mock/customerData';
import { applyVisit, getMyReservations, checkInReservation } from '../../api/reservation';
import { isLoggedIn } from '../../api/auth';
import './Modal.css';
import './EntryFlowModal.css';

const DAY_TICKET_FEE = 10000;

const fmtDate = (iso) => (iso ? iso.slice(0, 10).replace(/-/g, '.') : '');

function nowLabel() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 박람회 기간(startsAt~endsAt)의 날짜 목록 ('YYYY-MM-DD' 배열)
function expoDateRange(expo) {
  const dates = [];
  const cur = new Date(expo.startsAt);
  const end = new Date(expo.endsAt);
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// 박람회 시작일 이전에 신청하면 무료(사전 방문예약), 시작일 당일 이후면 유료(당일 입장권)
// — Reservation 서비스의 "시작일 이후 무료 발급 거부(409)" 업무 규칙과 동일한 기준
function isFreeReservation(expo) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(expo.startsAt);
  start.setHours(0, 0, 0, 0);
  return today < start;
}

// 당일 결제(mock) 플로우 전용 — 결제 완료 후 발급 API가 없어 화면 확인용으로만 생성
function buildMockPaidTicket(expo, visitDate) {
  return {
    id: `${expo.expoId}-${visitDate}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    expoId: expo.expoId,
    expoTitle: expo.title,
    startsAt: expo.startsAt,
    endsAt: expo.endsAt,
    venue: expo.venue,
    visitDate,
    holderName: '홍길동',
    ticketType: '당일 입장권 · 1인',
    bookingNo: `EX${visitDate.replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    purchasedAt: nowLabel(),
    usedAt: null,
  };
}

// POST /api/customer/reservations 응답(TicketResponse)을 화면/마이페이지 표시용 형태로 변환
// (사용가능/만료 여부는 저장하지 않고 getTicketStatus로 매번 계산함)
function mapReservationTicket(expo, t) {
  return {
    id: `ticket-${t.ticketId}`,
    ticketId: t.ticketId,
    expoId: t.expoId,
    expoTitle: expo.title,
    startsAt: expo.startsAt,
    endsAt: expo.endsAt,
    venue: expo.venue,
    visitDate: t.visitDate,
    holderName: '홍길동',
    ticketType: '무료 방문예약 · 1인',
    bookingNo: `TICKET-${t.ticketId}`,
    purchasedAt: t.issuedAt ? t.issuedAt.replace('T', ' ').slice(0, 16) : nowLabel(),
    usedAt: t.status === 'USED' ? t.issuedAt : null,
    qrImageBase64: t.qrImageBase64,
  };
}

// 박람회 목록에서 "선택하기"를 눌렀을 때 뜨는 입장 방법 선택 팝업 + 이어지는 전체 플로우.
// 업무 규칙: 날짜를 먼저 고르고, 박람회 시작일 이전 신청이면 무료 QR 즉시 발급,
// 시작일 이후(당일)면 결제 후 QR 발급 — 실제 Reservation/Payment API 계약과 동일한 조건 분기.
// 무료 경로는 실제 Reservation 서비스(POST /api/customer/reservations)로 연동됨.
// 유료(당일 결제) 경로는 결제 완료 후 실제 입장권을 발급하는 API가 아직 없어서(CLAUDE.md 참고)
// 결제~QR 발급 구간을 화면 확인용 목업으로 구성함.
function EntryFlowModal({ expo, onClose }) {
  const navigate = useNavigate();
  const [step, setStep] = useState('choose');
  const [selectedDates, setSelectedDates] = useState([]);
  const [payMethod, setPayMethod] = useState('card');
  const [agree, setAgree] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState(null);
  const [existingTickets, setExistingTickets] = useState([]);
  const [checkInError, setCheckInError] = useState(null);

  const freeMode = isFreeReservation(expo);
  const totalFee = freeMode ? 0 : DAY_TICKET_FEE * selectedDates.length;

  // 이 박람회에 이미 발급된 티켓이 있는지 — 실제 Reservation 서비스(GET /api/customer/reservations)에서 조회.
  // 비로그인이면 호출 자체를 스킵 (401 -> 인터셉터가 /login으로 튕기는 것 방지)
  useEffect(() => {
    if (!isLoggedIn()) {
      setExistingTickets([]);
      return;
    }
    let cancelled = false;
    getMyReservations()
      .then((list) => {
        if (cancelled) return;
        setExistingTickets(
          list.filter((t) => t.expoId === expo.expoId).map((t) => mapReservationTicket(expo, t))
        );
      })
      .catch(() => {
        // 목록 조회 실패해도 "방문 날짜 선택" 등 나머지 흐름은 그대로 쓸 수 있어야 하므로 조용히 무시
        if (!cancelled) setExistingTickets([]);
      });
    return () => {
      cancelled = true;
    };
  }, [expo]);

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

  const toggleDate = (date) => {
    setSelectedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]
    );
  };

  const confirmDates = () => {
    if (selectedDates.length === 0) return;
    if (freeMode) {
      issueFreeTickets();
    } else {
      setStep('payment');
    }
  };

  // 무료 사전 방문예약 — 실제 Reservation 서비스(POST /api/customer/reservations) 연동
  const issueFreeTickets = async () => {
    setApplyError(null);
    setApplying(true);
    try {
      const res = await applyVisit({ expoId: expo.expoId, visitDates: selectedDates });
      const issued = res.tickets.map((t) => mapReservationTicket(expo, t));
      setTickets(issued);
      setStep('ticket-qr');
    } catch (err) {
      setApplyError(
        err.response?.data?.error?.message ?? '예약 신청에 실패했습니다. 잠시 후 다시 시도해주세요.'
      );
    } finally {
      setApplying(false);
    }
  };

  // 당일 결제(mock) 완료 후 QR 발급 — 실제 발급 API가 없어 화면 확인용
  const issuePaidTickets = () => {
    const issued = selectedDates.map((d) => buildMockPaidTicket(expo, d));
    issued.forEach(addMyTicket);
    setTickets(issued);
    setStep('ticket-qr');
  };

  const showExistingQr = () => {
    setCheckInError(null);
    setTickets(existingTickets);
    setStep('existing-qr');
  };

  // 셀프 체크인 — 실제 Reservation 서비스(POST /api/customer/reservations/{ticketId}/check-in) 연동.
  // 본인 소유가 아니거나(403) 방문 예약일이 오늘이 아니거나 이미 사용됨(409)이면 에러 메시지로 표시.
  const checkInTicket = async (ticket) => {
    setCheckInError(null);
    try {
      await checkInReservation(ticket.ticketId);
      setTickets((prev) =>
        prev.map((t) => (t.id === ticket.id ? { ...t, usedAt: new Date().toISOString() } : t))
      );
      setStep('checkin-done');
    } catch (err) {
      setCheckInError(
        err.response?.data?.error?.message ?? '입장 체크에 실패했습니다. 잠시 후 다시 시도해주세요.'
      );
    }
  };

  return (
    <div className="c-modal__backdrop" onClick={onClose}>
      <div className="c-modal ef-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="c-modal__close" onClick={onClose} aria-label="닫기">
          ✕
        </button>

        {step === 'choose' && (
          <ChooseMethod
            hasExisting={existingTickets.length > 0}
            onQrExisting={showExistingQr}
            onApply={() => setStep('select-date')}
            onGuest={() => setStep('guest-info')}
          />
        )}

        {step === 'select-date' && (
          <SelectDate
            expo={expo}
            freeMode={freeMode}
            selectedDates={selectedDates}
            onToggleDate={toggleDate}
            totalFee={totalFee}
            onConfirm={confirmDates}
            applying={applying}
            applyError={applyError}
          />
        )}

        {step === 'existing-qr' && tickets.length > 0 && (
          <ExistingTicketQr
            expo={expo}
            ticket={tickets[0]}
            checkInError={checkInError}
            onCheckIn={() => checkInTicket(tickets[0])}
            onLookAround={goDetail}
          />
        )}

        {step === 'checkin-done' && <CheckInDone onLookAround={goDetail} onMyPage={goMyPage} />}

        {step === 'entry-guide' && <EntryGuide onLookAround={goDetail} onMyPage={goMyPage} />}

        {step === 'payment' && (
          <Payment
            amount={totalFee}
            payMethod={payMethod}
            setPayMethod={setPayMethod}
            agree={agree}
            setAgree={setAgree}
            onPaid={() => setStep('pay-done')}
          />
        )}

        {step === 'pay-done' && (
          <PayDone amount={totalFee} onCheckQr={issuePaidTickets} onLookAround={goDetail} />
        )}

        {step === 'ticket-qr' && tickets.length > 0 && (
          <TicketQr
            expo={expo}
            ticket={tickets[0]}
            extraCount={tickets.length - 1}
            onNext={() => setStep('entry-guide')}
            nextLabel="다음"
          />
        )}

        {step === 'guest-info' && <GuestInfo onLookAround={goDetail} onLogin={goLogin} />}
      </div>
    </div>
  );
}

function ChooseMethod({ hasExisting, onQrExisting, onApply, onGuest }) {
  return (
    <>
      <div className="c-modal__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" strokeLinecap="round" />
        </svg>
      </div>
      <h2>박람회 입장 방법을 선택해주세요</h2>
      <p className="c-modal__desc">
        {hasExisting
          ? '이미 발급받은 QR이 있어요. 바로 입장하거나 새로 신청할 수 있습니다.'
          : '방문 날짜를 고르면 QR 입장권이 발급됩니다.'}
      </p>

      <div className="ef-options">
        {hasExisting && (
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
              <span>이미 발급받은 입장권으로 바로 입장</span>
            </span>
            <span className="ef-option__chevron" />
          </button>
        )}

        <button type="button" className="ef-option" onClick={onApply}>
          <span className="ef-option__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
              <rect x="3" y="4" width="18" height="17" rx="2" />
              <path d="M3 9h18M8 3v3M16 3v3" strokeLinecap="round" />
            </svg>
          </span>
          <span className="ef-option__body">
            <strong>방문 날짜 선택하고 입장권 받기</strong>
            <span>박람회 시작 전이면 무료, 당일은 결제 후 QR 발급</span>
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
            <span>입장권 신청 없이 박람회 정보만 확인</span>
          </span>
          <span className="ef-option__chevron" />
        </button>
      </div>
    </>
  );
}

function SelectDate({
  expo,
  freeMode,
  selectedDates,
  onToggleDate,
  totalFee,
  onConfirm,
  applying,
  applyError,
}) {
  const dates = expoDateRange(expo);

  return (
    <>
      <div className="c-modal__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M3 9h18M8 3v3M16 3v3" strokeLinecap="round" />
        </svg>
      </div>
      <h2>방문 날짜를 선택해주세요</h2>
      <p className="c-modal__desc">
        {freeMode
          ? '박람회 시작 전 사전 신청은 무료로 QR이 발급됩니다.'
          : '박람회가 이미 시작되어 당일 입장권 결제가 필요합니다.'}
      </p>

      <div className="ef-date-list">
        {dates.map((d) => (
          <label key={d} className="ef-checkbox-row ef-date-item">
            <input
              type="checkbox"
              checked={selectedDates.includes(d)}
              onChange={() => onToggleDate(d)}
            />
            <span>{fmtDate(d)}</span>
          </label>
        ))}
      </div>

      <p className="ef-date-fee">
        {freeMode ? '결제 금액 : 무료' : `결제 예정 금액 : ₩${totalFee.toLocaleString()}`}
      </p>

      {applyError && <p className="ef-error">{applyError}</p>}

      <button
        type="button"
        className="c-modal__primary"
        disabled={selectedDates.length === 0 || applying}
        onClick={onConfirm}
      >
        {applying ? '신청 중...' : freeMode ? '무료 QR 발급받기' : '결제하러 가기'}
      </button>
    </>
  );
}

function TicketQr({ expo, ticket, extraCount, onNext, nextLabel }) {
  return (
    <>
      <p className="ef-ready-badge">
        <span className="ef-ready-badge__dot" />
        입장 준비 완료!
      </p>
      <p className="c-modal__desc">현장에서 이 QR을 제시해주세요.</p>
      <div className="ef-qr-box">
        {ticket.qrImageBase64 ? (
          <img
            src={`data:image/png;base64,${ticket.qrImageBase64}`}
            alt="입장 QR 코드"
            width={160}
            height={160}
          />
        ) : (
          <QrPlaceholder size={160} />
        )}
      </div>
      <h2 className="ef-qr-title">{expo.title}</h2>
      <p className="ef-qr-sub">
        {ticket.holderName} <span className="ef-qr-dot" /> {ticket.ticketType}
      </p>
      <p className="ef-qr-meta">
        방문일 {fmtDate(ticket.visitDate)}
        <br />
        {expo.venue}
        {extraCount > 0 && (
          <>
            <br />외 {extraCount}장은 마이페이지에서 확인하실 수 있습니다.
          </>
        )}
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

// 이미 발급된 QR 확인 화면. 방문 예약일(visitDate)이 오늘일 때만 "입장 체크" 가능
// — 체크인을 마치면 "사용완료", 체크인 없이 박람회 기간만 끝나면 "만료"로 갈리며 둘 다 재사용 불가.
function ExistingTicketQr({ expo, ticket, checkInError, onCheckIn, onLookAround }) {
  const status = getTicketStatus(ticket);
  const isInactive = status === '사용완료' || status === '만료';
  const checkableToday = status === '사용가능' && isTicketCheckableToday(ticket);

  return (
    <>
      <p className={`ef-ready-badge ${isInactive ? 'is-expired' : ''}`}>
        <span className="ef-ready-badge__dot" />
        {status === '사용완료'
          ? '사용완료된 입장권입니다'
          : status === '만료'
            ? '만료된 입장권입니다'
            : '발급된 QR 입장권'}
      </p>
      <div className="ef-qr-box">
        {ticket.qrImageBase64 ? (
          <img
            src={`data:image/png;base64,${ticket.qrImageBase64}`}
            alt="입장 QR 코드"
            width={160}
            height={160}
          />
        ) : (
          <QrPlaceholder size={160} />
        )}
      </div>
      <h2 className="ef-qr-title">{expo.title}</h2>
      <p className="ef-qr-sub">
        {ticket.holderName} <span className="ef-qr-dot" /> {ticket.ticketType}
      </p>
      <p className="ef-qr-meta">
        방문 예약일 {fmtDate(ticket.visitDate)}
        <br />
        {expo.venue}
      </p>

      {status === '사용완료' ? (
        <p className="ef-error ef-error--info">이미 입장 체크가 완료된 QR입니다.</p>
      ) : status === '만료' ? (
        <p className="ef-error ef-error--info">박람회 기간이 종료되어 사용할 수 없습니다.</p>
      ) : !checkableToday ? (
        <p className="ef-error ef-error--info">
          방문 예약일({fmtDate(ticket.visitDate)})에만 입장 체크가 가능합니다.
        </p>
      ) : null}

      {checkInError && <p className="ef-error">{checkInError}</p>}

      {checkableToday && (
        <button type="button" className="c-modal__primary" onClick={onCheckIn}>
          입장 체크하기
        </button>
      )}
      <button type="button" className="c-modal__secondary" onClick={onLookAround}>
        박람회 둘러보기
      </button>
    </>
  );
}

function CheckInDone({ onLookAround, onMyPage }) {
  return (
    <>
      <div className="c-modal__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2>입장 체크가 완료되었습니다!</h2>
      <p className="c-modal__desc">이 QR은 이제 사용완료로 표시되어 마이페이지에서 확인할 수 있습니다.</p>
      <button type="button" className="c-modal__primary" onClick={onLookAround}>
        박람회 둘러보기
      </button>
      <button type="button" className="c-modal__secondary" onClick={onMyPage}>
        마이페이지에서 확인하기
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

function Payment({ amount, payMethod, setPayMethod, agree, setAgree, onPaid }) {
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
        ₩{amount.toLocaleString()} 결제하기
      </button>
    </>
  );
}

function PayDone({ amount, onCheckQr, onLookAround }) {
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
          <dd>₩{amount.toLocaleString()}</dd>
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
