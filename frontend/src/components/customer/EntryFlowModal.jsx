import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as PortOne from '@portone/browser-sdk/v2';
import QrPlaceholder from './QrPlaceholder';
import { getTicketStatus, isTicketCheckableToday } from '../../mock/customerData';
import { downloadTicketImage } from '../../utils/downloadImage';
import { isLoggedIn } from '../../api/auth';
import { getMyProfile } from '../../api/identity';
import { payAdmission } from '../../api/payment';
import { applyVisit, getMyReservations, checkInReservation } from '../../api/reservation';
import './Modal.css';
import './EntryFlowModal.css';

// PortOne 결제 채널 식별용 공개 ID들 (비밀값 아님 - 프론트에 그대로 둬도 되는 값).
// 실제 카드 검증 비밀키(API Secret)는 절대 여기 두지 않고, 백엔드 환경변수(PORTONE_API_SECRET)로만 관리함.
const PORTONE_STORE_ID = 'store-9663b602-88a9-4fcf-a8b7-adad963c46e3';
const PORTONE_CHANNEL_KEY = 'channel-key-c5723eb4-9ee3-4df3-9c56-129d13d4e9d6';

const PAY_METHOD_CODE = {
  card: 'CARD',
  transfer: 'TRANSFER',
  virtual: 'VIRTUAL_ACCOUNT',
};

const fmtDate = (iso) => (iso ? iso.slice(0, 10).replace(/-/g, '.') : '');

function nowLabel() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// "오늘" 날짜 문자열(YYYY-MM-DD) — new Date().toISOString().slice(0,10)은 UTC로 변환되면서
// 한국(UTC+9)에서 하루가 밀리는 버그가 있어(expoDateRange와 같은 문제) 로컬 값으로 직접 조합함.
// 과거 날짜 선택을 막는 기준(min)으로 SelectDate에서 사용.
function todayDateString() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 박람회 기간(startsAt~endsAt)의 날짜 목록 ('YYYY-MM-DD' 배열).
// new Date(expo.startsAt)로 파싱하면(시간 포함 ISO라 "로컬 시간"으로 해석됨) 그 뒤 .toISOString()이
// UTC로 변환하면서 한국(UTC+9)에서는 하루가 앞당겨지는 버그가 있었음 — 로컬 자정을 UTC로 바꾸면
// 전날 15:00이 되기 때문. 날짜 계산을 아예 UTC 기준으로만 하도록(Date.UTC로 생성) 고쳐서
// 어느 타임존에서 열어도 항상 실제 달력 날짜 그대로 나오게 함.
function expoDateRange(expo) {
  const dates = [];
  const [sy, sm, sd] = expo.startsAt.slice(0, 10).split('-').map(Number);
  const [ey, em, ed] = expo.endsAt.slice(0, 10).split('-').map(Number);
  const cur = new Date(Date.UTC(sy, sm - 1, sd));
  const end = new Date(Date.UTC(ey, em - 1, ed));
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

// 박람회 시작일 이전에 신청하면 무료(사전 방문예약, Reservation 서비스 연동),
// 시작일 이후면 유료(Payment 서비스 실제 결제 연동)
// — Reservation 서비스의 "시작일 이후 무료 발급 거부(409)" 업무 규칙과 동일한 기준
function isFreeReservation(expo) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(expo.startsAt);
  start.setHours(0, 0, 0, 0);
  return today < start;
}

// 유료 결제 완료(POST /api/customer/admission-payments) 응답을 화면에 보여줄 티켓 객체로 변환.
// 결제 성공 시 Payment가 내부적으로 Reservation의 issueAdmissionTicket을 호출해 선택한 날짜 수만큼
// 실제 QR을 발급하고, 그 결과(payment.tickets: 날짜별 ticketId/visitDate/qrToken/qrImageBase64)를
// 이 결제 응답에 그대로 실어 돌려준다 — 응답을 안 쓰고 화면용으로 새로 fake 티켓을 만들면(예전
// buildMockPaidTicket) "나의 입장권"(실제 API 기반)에는 이 fake 티켓이 안 보이는 문제가 있었음.
// 진짜 발급된 티켓을 그대로 써야 마이페이지와 일치한다.
function mapAdmissionPaymentTicket(expo, payment, ticket, holderName) {
  return {
    id: `ticket-${ticket.ticketId}`,
    ticketId: ticket.ticketId,
    expoId: expo.expoId,
    expoTitle: expo.title,
    startsAt: expo.startsAt,
    endsAt: expo.endsAt,
    venue: expo.venue,
    visitDate: ticket.visitDate,
    holderName: holderName ?? '-',
    ticketType: '유료 입장권 · 1인',
    bookingNo: `TICKET-${ticket.ticketId}`,
    purchasedAt: payment.approvedAt ? payment.approvedAt.replace('T', ' ').slice(0, 16) : nowLabel(),
    usedAt: null,
    qrImageBase64: ticket.qrImageBase64,
  };
}

// POST /api/customer/reservations 응답(TicketResponse)을 화면/마이페이지 표시용 형태로 변환
// (사용가능/만료 여부는 저장하지 않고 getTicketStatus로 매번 계산함)
function mapReservationTicket(expo, t, holderName) {
  return {
    id: `ticket-${t.ticketId}`,
    ticketId: t.ticketId,
    expoId: t.expoId,
    expoTitle: expo.title,
    startsAt: expo.startsAt,
    endsAt: expo.endsAt,
    venue: expo.venue,
    visitDate: t.visitDate,
    holderName: holderName ?? '-',
    ticketType: '무료 방문예약 · 1인',
    bookingNo: `TICKET-${t.ticketId}`,
    purchasedAt: t.issuedAt ? t.issuedAt.replace('T', ' ').slice(0, 16) : nowLabel(),
    usedAt: t.status === 'USED' ? t.issuedAt : null,
    qrImageBase64: t.qrImageBase64,
  };
}

// 박람회 목록에서 "선택하기"를 눌렀을 때 뜨는 입장 방법 선택 팝업 + 이어지는 전체 플로우.
// 업무 규칙: 날짜를 먼저 고르고(무료/유료 모두 다중 선택 가능, 이미 지난 날짜·이미 QR을 받은 날짜는
// 선택 불가), 박람회 시작일 이전 신청이면 무료 QR 즉시 발급, 시작일 이후면 결제 후 QR 발급.
// - 무료 경로: 실제 Reservation 서비스(POST/GET /api/customer/reservations, 체크인)로 연동됨.
// - 유료 경로: 실제 PortOne 결제 + 백엔드(POST /api/customer/admission-payments)로 연동됨. 무료
//   경로와 동일하게 날짜를 여러 개 골라 한 번에 결제하면(금액 = 1일 입장료 x 날짜 수) 그 수만큼
//   티켓이 각각 발급된다. "고객당 박람회당 결제 1건" 제약은 없음 — 날짜가 겹치지만 않으면 같은
//   박람회를 여러 번에 나눠 결제 가능(겹치는 날짜는 서버가 blockedDates로 막고, 프론트도 이미
//   발급된 날짜는 애초에 선택 불가로 미리 막아둠).
function EntryFlowModal({ expo, onClose }) {
  const navigate = useNavigate();
  const [step, setStep] = useState('choose');
  const [selectedDates, setSelectedDates] = useState([]);
  const [payMethod, setPayMethod] = useState('card');
  const [agree, setAgree] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState(null);
  const [applyNotice, setApplyNotice] = useState(null);
  const [existingTickets, setExistingTickets] = useState([]);
  const [checkInError, setCheckInError] = useState(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState(null);
  const [paidPayment, setPaidPayment] = useState(null);
  const [holderName, setHolderName] = useState(null);

  const freeMode = isFreeReservation(expo);
  const admissionFee = expo.admissionFee ?? 0;
  const totalFee = freeMode ? 0 : admissionFee * selectedDates.length;

  // 이 박람회에 이미 발급된 티켓이 있는지 — 실제 Reservation 서비스(GET /api/customer/reservations)에서 조회.
  // 비로그인이면 호출 자체를 스킵 (401 -> 인터셉터가 /login으로 튕기는 것 방지)
  // 발급될 QR/티켓에 표시할 본인 이름 — 실제 로그인한 사용자의 이름(회원가입 시 등록한 이름)을 써야 함
  useEffect(() => {
    if (!isLoggedIn()) {
      setHolderName(null);
      return;
    }
    let cancelled = false;
    getMyProfile()
      .then((profile) => {
        if (!cancelled) setHolderName(profile?.name ?? null);
      })
      .catch(() => {
        if (!cancelled) setHolderName(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
          list.filter((t) => t.expoId === expo.expoId).map((t) => mapReservationTicket(expo, t, holderName))
        );
      })
      .catch(() => {
        if (!cancelled) setExistingTickets([]);
      });
    return () => {
      cancelled = true;
    };
  }, [expo, holderName]);

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

  // 무료/유료 모두 날짜를 여러 개 토글 가능 — 유료는 날짜 수만큼 결제 금액이 합산됨(totalFee 계산부 참고).
  // 이미 지난 날짜는 SelectDate에서 애초에 선택 불가(disabled)로 막아둠.
  const toggleDate = (date) => {
    setSelectedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]
    );
  };

  const confirmDates = () => {
    if (selectedDates.length === 0) return;
    if (freeMode) {
      issueFreeTickets();
      return;
    }
    // 유료 결제는 로그인한 회원만 가능
    if (!isLoggedIn()) {
      setStep('login-required');
      return;
    }
    setStep('payment');
  };

  // 무료 사전 방문예약 — 실제 Reservation 서비스(POST /api/customer/reservations) 연동.
  // 이 API는 같은 날짜로 재신청하면 새로 만들지 않고 기존 QR을 그대로 돌려주는 멱등 동작이라
  // 응답만 보면 "새로 발급"과 구분이 안 됨 — 호출 전에 이 모달이 이미 들고 있는 existingTickets와
  // 비교해서 "이미 발급된 날짜"를 미리 골라내고, 그 날짜는 새로 발급된 게 아니라는 안내를 같이 보여준다.
  const issueFreeTickets = async () => {
    setApplyError(null);
    setApplyNotice(null);
    setApplying(true);
    const existingDates = new Set(existingTickets.map((t) => t.visitDate));
    const duplicateDates = selectedDates.filter((d) => existingDates.has(d));
    try {
      const res = await applyVisit({ expoId: expo.expoId, visitDates: selectedDates });
      const issued = res.tickets.map((t) => mapReservationTicket(expo, t, holderName));
      setTickets(issued);
      if (duplicateDates.length > 0) {
        setApplyNotice(
          `${duplicateDates.map(fmtDate).join(', ')} 방문 예약은 이미 발급되어 있는 QR입니다. 새로 발급되지 않고 기존 QR을 그대로 보여드려요.`
        );
      }
      setStep('ticket-qr');
    } catch (err) {
      setApplyError(
        err.response?.data?.error?.message ?? '예약 신청에 실패했습니다. 잠시 후 다시 시도해주세요.'
      );
    } finally {
      setApplying(false);
    }
  };

  // 유료 입장권 결제 — 실제 PortOne 결제 + 백엔드 결제 API 연동. 선택한 날짜 수만큼 결제 금액이 합산됨.
  const handlePay = async () => {
    setPayError(null);
    setPaying(true);
    // 결제 건마다 고유해야 하는 ID. PortOne 결제창과 우리 서버 양쪽에 동일한 값을 사용해서
    // 서버가 나중에 "이 ID로 결제된 게 진짜 맞는지" PortOne에 재확인할 수 있게 함.
    const paymentId = `admission-${crypto.randomUUID()}`;
    try {
      const response = await PortOne.requestPayment({
        storeId: PORTONE_STORE_ID,
        channelKey: PORTONE_CHANNEL_KEY,
        paymentId,
        orderName: `${expo.title} 입장권 (${selectedDates.length}일)`,
        totalAmount: totalFee,
        currency: 'CURRENCY_KRW',
        payMethod: PAY_METHOD_CODE[payMethod],
        redirectUrl: `${window.location.origin}/customer/expos`,
      });

      if (response.code) {
        setPayError(response.message ?? '결제가 취소되었거나 실패했습니다.');
        setPaying(false);
        return;
      }

      const payment = await payAdmission({
        expoId: expo.expoId,
        visitDates: selectedDates,
        amount: totalFee,
        payMethod: PAY_METHOD_CODE[payMethod],
        paymentId,
      });
      setPaidPayment(payment);

      setStep('pay-done');
    } catch (err) {
      setPayError(err.response?.data?.error?.message ?? '결제 처리 중 오류가 발생했습니다.');
    } finally {
      setPaying(false);
    }
  };

  // 결제 완료 후 QR 발급 화면으로 — handlePay에서 받아둔 실제 결제 응답(payment.tickets: 날짜별
  // 진짜 발급된 QR 목록)을 그대로 씀. tickets가 비어있으면(Reservation 발급 호출이 실패해 결제만
  // 완료된 예외 상황) QR 없이 안내만 보여줌 — "나의 입장권"은 실제 Reservation API 기준이라,
  // 이 경우엔 거기에도 안 뜨는 게 맞는 상태.
  const issuePaidTickets = () => {
    setTickets(
      (paidPayment.tickets ?? []).map((t) => mapAdmissionPaymentTicket(expo, paidPayment, t, holderName))
    );
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
            loggedIn={isLoggedIn()}
            onQrExisting={showExistingQr}
            onApply={() => setStep('select-date')}
            onGuest={() => setStep('guest-info')}
            onBrowse={goDetail}
          />
        )}

        {step === 'login-required' && (
          <LoginRequired onLogin={goLogin} onGuest={() => setStep('guest-info')} />
        )}

        {step === 'select-date' && (
          <SelectDate
            expo={expo}
            freeMode={freeMode}
            existingTickets={existingTickets}
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
            paying={paying}
            payError={payError}
            onPaid={handlePay}
          />
        )}

        {step === 'pay-done' && (
          <PayDone amount={totalFee} payMethod={payMethod} onCheckQr={issuePaidTickets} onLookAround={goDetail} />
        )}

        {step === 'ticket-qr' && tickets.length > 0 && (
          <TicketQr
            expo={expo}
            ticket={tickets[0]}
            extraCount={tickets.length - 1}
            notice={applyNotice}
            onNext={() => setStep('entry-guide')}
            nextLabel="다음"
          />
        )}

        {step === 'guest-info' && <GuestInfo onLookAround={goDetail} onLogin={goLogin} />}
      </div>
    </div>
  );
}

function ChooseMethod({ hasExisting, loggedIn, onQrExisting, onApply, onGuest, onBrowse }) {
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
            <span>박람회 시작 전이면 무료, 시작 이후는 결제 후 QR 발급</span>
          </span>
          <span className="ef-option__chevron" />
        </button>
        <button type="button" className="ef-option" onClick={loggedIn ? onBrowse : onGuest}>
          <span className="ef-option__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </span>
          <span className="ef-option__body">
            <strong>{loggedIn ? '박람회 정보 둘러보기' : '로그인 없이 둘러보기'}</strong>
            <span>입장권 신청 없이 박람회 정보만 확인</span>
          </span>
          <span className="ef-option__chevron" />
        </button>
      </div>
    </>
  );
}

function LoginRequired({ onLogin, onGuest }) {
  return (
    <>
      <div className="c-modal__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </div>
      <h2>로그인이 필요합니다</h2>
      <p className="c-modal__desc">유료 입장권 결제는 로그인한 회원만 이용할 수 있습니다.</p>
      <button type="button" className="c-modal__primary" onClick={onLogin}>
        로그인하러 가기
      </button>
      <button type="button" className="c-modal__secondary" onClick={onGuest}>
        로그인 없이 둘러보기
      </button>
    </>
  );
}

function SelectDate({
  expo,
  freeMode,
  existingTickets,
  selectedDates,
  onToggleDate,
  totalFee,
  onConfirm,
  applying,
  applyError,
}) {
  const dates = expoDateRange(expo);
  const today = todayDateString();
  // 유료 모드는 이미 QR을 받은 날짜를 다시 결제하지 않도록 애초에 선택 자체를 막는다 — 백엔드도
  // 같은 날짜 재구매를 blockedDates로 막지만, 결제창까지 갔다가 막히는 것보다 여기서 막는 게 낫다.
  // 무료 모드는 재신청이 멱등(기존 QR 그대로 반환)이라 그대로 둠.
  const alreadyIssuedDates = new Set(freeMode ? [] : existingTickets.map((t) => t.visitDate));
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
          : '박람회가 이미 시작되어 선택한 날짜 수만큼 입장권 결제가 필요합니다.'}
      </p>
      <div className="ef-date-list">
        {dates.map((d) => {
          const isPast = d < today;
          const isAlreadyIssued = !isPast && alreadyIssuedDates.has(d);
          const disabled = isPast || isAlreadyIssued;
          return (
            <label key={d} className={`ef-checkbox-row ef-date-item${disabled ? ' is-disabled' : ''}`}>
              <input
                type="checkbox"
                checked={selectedDates.includes(d)}
                disabled={disabled}
                onChange={() => onToggleDate(d)}
              />
              <span>
                {fmtDate(d)}
                {isPast && ' (지난 날짜)'}
                {isAlreadyIssued && ' (이미 발급됨)'}
              </span>
            </label>
          );
        })}
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

function TicketQr({ expo, ticket, extraCount, notice, onNext, nextLabel }) {
  return (
    <>
      <p className="ef-ready-badge">
        <span className="ef-ready-badge__dot" />
        입장 준비 완료!
      </p>
      <p className="c-modal__desc">현장에서 이 QR을 제시해주세요.</p>
      {notice && <p className="ef-error ef-error--info">{notice}</p>}
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
      <button
        type="button"
        className="c-modal__secondary"
        onClick={() => downloadTicketImage(ticket, `QR_${ticket.bookingNo}`)}
      >
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

function Payment({ amount, payMethod, setPayMethod, agree, setAgree, paying, payError, onPaid }) {
  const canPay = agree && !paying;

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

      <div className="ef-card-form">
        <p className="ef-card-form__title">유료 입장권 결제</p>
        <p className="c-modal__desc" style={{ margin: '0 0 1rem' }}>
          '결제하기' 클릭 시 실제 PortOne 결제창이 새로 열립니다. 카드/계좌 정보는 그 결제창에서 직접
          입력합니다. 테스트 채널로 연결되어 있어 실제 대금은 빠져나가지 않습니다.
        </p>
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

      {payError && (
        <p className="c-modal__desc" style={{ color: '#dc2626' }}>
          {payError}
        </p>
      )}

      <button type="button" className="c-modal__primary" disabled={!canPay} onClick={onPaid}>
        {paying ? '결제 처리 중...' : `₩${amount.toLocaleString()} 결제하기`}
      </button>
    </>
  );
}

function PayDone({ amount, payMethod, onCheckQr, onLookAround }) {
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
          <dd>{PAY_METHODS.find((m) => m.key === payMethod)?.label ?? payMethod}</dd>
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