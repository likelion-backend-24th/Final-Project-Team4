import { CalendarDays, Check, CircleAlert, Eye, FileText, Info, LogIn, MapPin, QrCode } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as PortOne from '@portone/browser-sdk/v2';
import QrPlaceholder from '@/components/customer/QrPlaceholder';
import { getTicketStatus, isTicketCheckableToday } from '@/utils/customerData.js';
import { downloadTicketImage } from '@/utils/downloadImage.js';
import { isLoggedIn } from '@/api/auth.js';
import { getMyProfile } from '@/api/identity.js';
import { payAdmission, PENDING_ADMISSION_PAYMENT_KEY } from '@/api/payment.js';
import { applyVisit, getMyReservations, checkInReservation } from '@/api/reservation.js';
import { toAssetUrl } from '@/api/expo.js';
import { AppDialog, InfoList } from '@/components/layout/AppDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

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


// 관리자가 아직 행사 소개 문구를 입력하지 않은 박람회용 기본 문구.
// ExpoDetail.jsx의 "개요" 탭에 있는 문구와 동일한 톤으로 맞춤(제목만 다르게 끼워넣음).
const defaultExpoDescription = (title) =>
  `${title}은(는) 다양한 브랜드와 참가업체가 한자리에 모이는 박람회입니다. 풍성한 부스와 프로그램을 통해 새로운 비즈니스 기회를 만나보세요.`;

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

function pickDefaultTicketIndex(tickets) {
  const today = todayDateString();
  const isUsable = (t) => t.status !== 'CANCELLED';

  const todayIdx = tickets.findIndex((t) => isUsable(t) && t.visitDate === today);
  if (todayIdx !== -1) return todayIdx;

  const upcoming = tickets
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => isUsable(t))
    .sort((a, b) => a.t.visitDate.localeCompare(b.t.visitDate));
  if (upcoming.length > 0) return upcoming[0].i;

  return 0;
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
    status: t.status,
    qrImageBase64: t.qrImageBase64,
  };
}

// 박람회 목록에서 "선택하기"를 눌렀을 때 뜨는 입장 방법 선택 팝업 + 이어지는 전체 플로우.
// 업무 규칙: 날짜를 먼저 고르고(무료/유료 모두 다중 선택 가능, 이미 지난 날짜·이미 QR을 받은 날짜는
// 선택 불가 — 무료/유료 공통), 박람회 시작일 이전 신청이면 무료 QR 즉시 발급, 시작일 이후면 결제 후 QR 발급.
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
  const [existingIndex, setExistingIndex] = useState(0);

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
    const pendingPayment = {
      expoId: expo.expoId,
      visitDates: selectedDates,
      amount: totalFee,
      payMethod: PAY_METHOD_CODE[payMethod],
      paymentId,
    };
    // 모바일에서 결제 후 페이지가 이동했다 돌아오면 이 컴포넌트는 사라지고 없으므로, 돌아온 페이지가
    // 이어받을 수 있게 결제 정보를 미리 저장(CustomerExpoList의 리다이렉트 처리에서 사용).
    localStorage.setItem(PENDING_ADMISSION_PAYMENT_KEY, JSON.stringify(pendingPayment));
    try {
      const response = await PortOne.requestPayment({
        storeId: PORTONE_STORE_ID,
        channelKey: PORTONE_CHANNEL_KEY,
        paymentId,
        orderName: `${expo.title} 입장권 (${selectedDates.length}일)`,
        totalAmount: totalFee,
        currency: 'CURRENCY_KRW',
        payMethod: PAY_METHOD_CODE[payMethod],
        redirectUrl: `${window.location.origin}/customer`,
      });

      if (response.code) {
        localStorage.removeItem(PENDING_ADMISSION_PAYMENT_KEY);
        setPayError(response.message ?? '결제가 취소되었거나 실패했습니다.');
        setPaying(false);
        return;
      }

      const payment = await payAdmission(pendingPayment);
      localStorage.removeItem(PENDING_ADMISSION_PAYMENT_KEY);
      setPaidPayment(payment);

      // 결제(PAID)는 성공했는데 Reservation 발급 호출이 실패하면 payment.tickets가 비어서 온다
      // (AdmissionPaymentService.pay 7번 단계 — 예외를 삼키고 결제만 저장). 이 경우 QR 화면으로 보내면
      // tickets.length===0이라 'ticket-qr' 스텝이 아무것도 못 그리므로, 별도 안내 화면으로 분기한다.
      const issued = payment.status === 'PAID' && (payment.tickets?.length ?? 0) > 0;
      setStep(issued ? 'pay-done' : 'pay-issue-failed');
    } catch (err) {
      localStorage.removeItem(PENDING_ADMISSION_PAYMENT_KEY);
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
    setExistingIndex(pickDefaultTicketIndex(existingTickets));
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

  const stepTitle = {
    choose: '입장 방법 선택',
    'login-required': '로그인이 필요합니다',
    'select-date': '방문 날짜를 선택해주세요',
    'existing-qr': '입장권 QR',
    'checkin-done': '입장 체크 완료',
    'entry-guide': '사전 체크인 완료',
    payment: '결제 수단 선택',
    'pay-done': '결제 완료',
    'pay-issue-failed': '결제 완료 · QR 발급 실패',
    'ticket-qr': '입장 준비 완료!',
    'guest-info': '박람회 정보 둘러보기',
  }[step];

  return (
    <AppDialog
      onClose={onClose}
      size={step === 'choose' ? 'xl' : 'sm'}
      title={<span className={step === 'choose' ? 'sr-only' : undefined}>{stepTitle}</span>}
    >
      {step === 'choose' && (
        <ChooseMethod
          expo={expo}
          hasExisting={existingTickets.length > 0}
          loggedIn={isLoggedIn()}
          onQrExisting={showExistingQr}
          onApply={() => setStep('select-date')}
          onGuest={() => setStep('guest-info')}
          onBrowse={goDetail}
          onCancel={onClose}
        />
      )}

      {step === 'login-required' && <LoginRequired onLogin={goLogin} onGuest={() => setStep('guest-info')} />}

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
          ticket={tickets}
          selectedIndex={Math.min(existingIndex, tickets.length - 1)}
          onSelectIndex={setExistingIndex}
          checkInError={checkInError}
          onCheckIn={() => checkInTicket(tickets[existingIndex])}
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

      {step === 'pay-issue-failed' && (
        <PayIssueFailed amount={totalFee} payMethod={payMethod} onMyPage={goMyPage} onLookAround={goDetail} />
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
    </AppDialog>
  );
}

// 각 단계 공통 - 위쪽 원형 아이콘 + 안내 문구 + 하단 버튼 묶음
function StepIntro({ icon, title, desc }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      {icon && (
        <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary [&_svg]:size-6">
          {icon}
        </span>
      )}
      {title && <h2 className="m-0 text-lg font-semibold">{title}</h2>}
      {desc && <p className="m-0 text-sm leading-relaxed text-muted-foreground">{desc}</p>}
    </div>
  );
}

function StepActions({ children }) {
  return <div className="flex flex-col gap-2">{children}</div>;
}

const ENTRY_OPTIONS = {
  existing: { icon: QrCode, title: 'QR 사전 입장', desc: '이미 발급받은 입장권으로 바로 입장합니다.' },
  apply: { icon: CalendarDays, title: '방문 날짜 선택하고 입장권 받기', desc: '방문할 날짜를 선택하면 즉시 QR 입장권이 발급됩니다.' },
};

function ChooseMethod({ expo, hasExisting, loggedIn, onQrExisting, onApply, onGuest, onBrowse, onCancel }) {
  const [method, setMethod] = useState(hasExisting ? 'existing' : 'apply');

  const browseLabel = loggedIn ? '박람회 정보만 둘러보기' : '로그인 없이 둘러보기';
  const browseDesc = loggedIn
    ? '지금은 입장권을 발급하지 않고, 박람회 정보만 확인합니다.'
    : '로그인 없이도 박람회 정보를 확인할 수 있습니다.';

  const handleConfirm = () => {
    if (method === 'existing') onQrExisting();
    else if (method === 'apply') onApply();
    else if (loggedIn) onBrowse();
    else onGuest();
  };

  const options = [
    ...(hasExisting ? [['existing', ENTRY_OPTIONS.existing]] : []),
    ['apply', ENTRY_OPTIONS.apply],
    ['browse', { icon: Eye, title: browseLabel, desc: browseDesc }],
  ];

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col gap-4">
        <div
          className="relative flex h-40 flex-col justify-end gap-2 overflow-hidden rounded-xl bg-slate-800 bg-cover bg-center p-4 text-white"
          style={expo.bannerImageUrl ? { backgroundImage: `url(${toAssetUrl(expo.bannerImageUrl)})` } : undefined}
        >
          <Badge className="w-fit" variant={expo.phase === '진행중' ? 'default' : 'secondary'}>
            {expo.phase}
          </Badge>
          <h3 className="m-0 text-xl leading-tight font-bold drop-shadow">{expo.title}</h3>
        </div>

        <div className="flex flex-col gap-3 text-sm">
          <div className="flex items-start gap-2.5">
            <CalendarDays className="mt-0.5 size-[18px] text-muted-foreground" />
            <div>
              <p className="m-0 text-xs text-muted-foreground">행사 기간</p>
              <p className="m-0 font-medium">
                {fmtDate(expo.startsAt)} - {fmtDate(expo.endsAt)}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 size-[18px] text-muted-foreground" />
            <div>
              <p className="m-0 text-xs text-muted-foreground">행사 장소</p>
              <p className="m-0 font-medium">{expo.venue}</p>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="m-0 mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
            <FileText className="size-4" /> 행사 소개
          </h4>
          <p className="m-0 text-sm leading-relaxed text-muted-foreground">
            {expo.description?.trim() ? expo.description : defaultExpoDescription(expo.title)}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <h2 className="m-0 text-lg font-semibold">입장 방법을 선택해주세요</h2>
          <p className="mt-1 mb-0 text-sm text-muted-foreground">선택한 방법에 따라 입장권이 발급됩니다.</p>
        </div>

        <RadioGroup value={method} onValueChange={setMethod} className="gap-2">
          {options.map(([value, { icon: Icon, title, desc }]) => (
            <Label
              key={value}
              htmlFor={`entry-${value}`}
              className={cn(
                'cursor-pointer items-start gap-3 rounded-xl border p-3.5 font-normal transition-colors',
                method === value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              )}
            >
              <RadioGroupItem id={`entry-${value}`} value={value} className="mt-1" />
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="size-5" />
              </span>
              <span className="grid gap-0.5">
                <strong className="text-sm">{title}</strong>
                <span className="text-xs leading-snug text-muted-foreground">{desc}</span>
              </span>
            </Label>
          ))}
        </RadioGroup>

        <StepActions>
          <Button type="button" size="lg" onClick={handleConfirm}>
            선택한 방법으로 진행하기
          </Button>
          <Button type="button" size="lg" variant="outline" onClick={onCancel}>
            취소
          </Button>
        </StepActions>

        <Alert>
          <Info />
          <AlertTitle>안내사항</AlertTitle>
          <AlertDescription>
            <ul className="m-0 list-disc pl-4">
              <li>선택한 방법으로 입장권이 발급되며, 현장에서 QR 코드로 입장합니다.</li>
              <li>입장권은 1인 1매 기준으로 발급됩니다.</li>
              <li>행사 일정 및 운영 시간은 주최 측 사정에 따라 변경될 수 있습니다.</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

function LoginRequired({ onLogin, onGuest }) {
  return (
    <>
      <StepIntro icon={<LogIn />} title="로그인이 필요합니다" desc="유료 입장권 결제는 로그인한 회원만 이용할 수 있습니다." />
      <StepActions>
        <Button size="lg" onClick={onLogin}>로그인하러 가기</Button>
        <Button size="lg" variant="outline" onClick={onGuest}>로그인 없이 둘러보기</Button>
      </StepActions>
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
  // 이미 QR을 받은 날짜는 무료/유료 모두 "발급완료"로 표시하고 선택을 막는다 — 유료는 결제창까지
  // 갔다가 blockedDates로 막히는 것보다 낫고, 무료는 재신청해도 기존 QR만 돌려받는 멱등 동작이라 의미 없음.
  const alreadyIssuedDates = new Set(existingTickets.map((t) => t.visitDate));
  // 환불/취소된 티켓의 날짜는 "발급완료"가 아니라 "환불됨"으로 보여주고, 다시 신청할 수도 없다(서버가 날짜당 티켓 1건).
  const cancelledDates = new Set(existingTickets.filter((t) => t.status === 'CANCELLED').map((t) => t.visitDate));
  return (
    <>
      <StepIntro
        icon={<CalendarDays />}
        title="방문 날짜를 선택해주세요"
        desc={
          freeMode
            ? '박람회 시작 전 사전 신청은 무료로 QR이 발급됩니다.'
            : '박람회가 이미 시작되어 선택한 날짜 수만큼 입장권 결제가 필요합니다.'
        }
      />
      <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto rounded-lg border p-2">
        {dates.map((d) => {
          const isPast = d < today;
          const isAlreadyIssued = !isPast && alreadyIssuedDates.has(d);
          const disabled = isPast || isAlreadyIssued;
          return (
            <Label
              key={d}
              className={cn(
                'cursor-pointer rounded-md px-2.5 py-2 font-normal hover:bg-muted',
                disabled && 'cursor-not-allowed text-muted-foreground opacity-60 hover:bg-transparent'
              )}
            >
              <Checkbox checked={selectedDates.includes(d)} disabled={disabled} onCheckedChange={() => onToggleDate(d)} />
              <span>
                {fmtDate(d)}
                {isPast && ' (지난 날짜)'}
                {isAlreadyIssued && (cancelledDates.has(d) ? ' (환불됨)' : ' (발급완료)')}
              </span>
            </Label>
          );
        })}
      </div>
      <p className="m-0 text-center text-sm font-semibold">
        {freeMode ? '결제 금액 : 무료' : `결제 예정 금액 : ₩${totalFee.toLocaleString()}`}
      </p>
      {applyError && <p className="m-0 text-sm text-destructive">{applyError}</p>}
      <Button size="lg" disabled={selectedDates.length === 0 || applying} onClick={onConfirm}>
        {applying ? '신청 중...' : freeMode ? '무료 QR 발급받기' : '결제하러 가기'}
      </Button>
    </>
  );
}

function QrImage({ ticket }) {
  return (
    <div className="mx-auto flex size-44 items-center justify-center rounded-xl border bg-white p-2">
      {ticket.qrImageBase64 ? (
        <img src={`data:image/png;base64,${ticket.qrImageBase64}`} alt="입장 QR 코드" width={160} height={160} />
      ) : (
        <QrPlaceholder size={160} />
      )}
    </div>
  );
}

function TicketQr({ expo, ticket, extraCount, notice, onNext, nextLabel }) {
  return (
    <>
      <p className="m-0 flex items-center justify-center gap-2 text-sm font-semibold text-emerald-600">
        <span className="size-2 rounded-full bg-emerald-500" />
        입장 준비 완료!
      </p>
      <p className="m-0 text-center text-sm text-muted-foreground">현장에서 이 QR을 제시해주세요.</p>
      {notice && <p className="m-0 rounded-lg bg-primary/5 p-3 text-sm text-primary">{notice}</p>}
      <QrImage ticket={ticket} />
      <div className="text-center">
        <h2 className="m-0 text-lg font-semibold">{expo.title}</h2>
        <p className="mt-1 mb-0 text-sm text-muted-foreground">
          {ticket.holderName} · {ticket.ticketType}
        </p>
        <p className="mt-2 mb-0 text-sm leading-relaxed text-muted-foreground">
          방문일 {fmtDate(ticket.visitDate)}
          <br />
          {expo.venue}
          {extraCount > 0 && (
            <>
              <br />외 {extraCount}장은 마이페이지에서 확인하실 수 있습니다.
            </>
          )}
        </p>
      </div>
      <StepActions>
        <Button size="lg" onClick={onNext}>{nextLabel}</Button>
        <Button size="lg" variant="outline" onClick={() => downloadTicketImage(ticket, `QR_${ticket.bookingNo}`)}>
          이미지 저장하기
        </Button>
      </StepActions>
    </>
  );
}

// 이미 발급된 QR 확인 화면. 방문 예약일(visitDate)이 오늘일 때만 "입장 체크" 가능
// — 체크인을 마치면 "사용완료", 체크인 없이 박람회 기간만 끝나면 "만료"로 갈리며 둘 다 재사용 불가.
function ExistingTicketQr({ expo, tickets, selectedIndex, onSelectIndex, checkInError, onCheckIn, onLookAround }) {
  const ticket = tickets[selectedIndex];
  const status = getTicketStatus(ticket); // '환불' | '사용완료' | '만료' | '사용예정' | '사용가능'
  const isCancelled = status === '환불';
  const isInactive = isCancelled || status === '사용완료' || status === '만료';
  const checkableToday = !isCancelled && status === '사용가능' && isTicketCheckableToday(ticket);

  return (
    <>
      {tickets.length > 1 && (
        <Tabs value={String(selectedIndex)} onValueChange={(v) => onSelectIndex(Number(v))}>
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
            {tickets.map((t, i) => (
              <TabsTrigger
                key={t.id}
                value={String(i)}
                className={cn(t.status === 'CANCELLED' && 'text-red-600')}
              >
                {fmtDate(t.visitDate)}
                {t.status === 'CANCELLED' && ' (환불됨)'}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
      <p className={cn('m-0 flex items-center justify-center gap-2 text-sm font-semibold', isInactive ? 'text-muted-foreground' : 'text-emerald-600')}>
        <span className={cn('size-2 rounded-full', isInactive ? 'bg-slate-400' : 'bg-emerald-500')} />
        {isCancelled
          ? '환불된 입장권입니다'
          : status === '사용완료'
            ? '사용완료된 입장권입니다'
            : status === '만료'
              ? '만료된 입장권입니다'
              : '발급된 QR 입장권'}
      </p>
      {!isCancelled && <QrImage ticket={ticket} />}
      <div className="text-center">
        <h2 className="m-0 text-lg font-semibold">{expo.title}</h2>
        <p className="mt-1 mb-0 text-sm text-muted-foreground">
          {ticket.holderName} · {ticket.ticketType}
        </p>
        <p className="mt-2 mb-0 text-sm leading-relaxed text-muted-foreground">
          방문 예약일 {fmtDate(ticket.visitDate)}
          <br />
          {expo.venue}
        </p>
      </div>
      {isCancelled ? (
        <p className="m-0 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          환불(취소)된 입장권이라 사용할 수 없습니다.
          {tickets.length > 1 && ' 위에서 다른 날짜를 선택해주세요.'}
        </p>
      ) : status === '사용완료' ? (
        <p className="m-0 rounded-lg bg-muted p-3 text-sm text-muted-foreground">이미 입장 체크가 완료된 QR입니다.</p>
      ) : status === '만료' ? (
        <p className="m-0 rounded-lg bg-muted p-3 text-sm text-muted-foreground">박람회 기간이 종료되어 사용할 수 없습니다.</p>
      ) : !checkableToday ? (
        <p className="m-0 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          방문 예약일({fmtDate(ticket.visitDate)})에만 입장 체크가 가능합니다.
        </p>
      ) : null}
      {checkInError && <p className="m-0 text-sm text-destructive">{checkInError}</p>}
      <StepActions>
        {checkableToday && (
          <Button size="lg" onClick={onCheckIn}>입장 체크하기</Button>
        )}
        <Button size="lg" variant="outline" onClick={onLookAround}>박람회 둘러보기</Button>
      </StepActions>
    </>
  );
}

function CheckInDone({ onLookAround, onMyPage }) {
  return (
    <>
      <StepIntro
        icon={<Check className="text-green-600" />}
        title="입장 체크가 완료되었습니다!"
        desc="이 QR은 이제 사용완료로 표시되어 마이페이지에서 확인할 수 있습니다."
      />
      <StepActions>
        <Button size="lg" onClick={onLookAround}>박람회 둘러보기</Button>
        <Button size="lg" variant="outline" onClick={onMyPage}>마이페이지에서 확인하기</Button>
      </StepActions>
    </>
  );
}

function BulletList({ items }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-1.5 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
      {items.map((t) => (
        <li key={t} className="flex items-start gap-2">
          <Check className="mt-0.5 size-4 shrink-0 text-primary" />
          {t}
        </li>
      ))}
    </ul>
  );
}

function EntryGuide({ onLookAround, onMyPage }) {
  return (
    <>
      <StepIntro
        icon={<Check />}
        title="사전 체크인이 완료되었습니다!"
        desc="현장에서 QR을 제시하시면 빠르게 입장하실 수 있습니다."
      />
      <BulletList items={['QR은 1인 1회만 사용 가능합니다.', '현장 입구에서 QR을 제시해주세요.', '스크린샷 사용 가능합니다.']} />
      <StepActions>
        <Button size="lg" onClick={onLookAround}>박람회 둘러보기</Button>
        <Button size="lg" variant="outline" onClick={onMyPage}>마이페이지에서 다시 보기</Button>
      </StepActions>
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
      <div>
        <h2 className="m-0 text-lg font-semibold">결제 수단 선택</h2>
        <p className="mt-1 mb-0 text-sm text-muted-foreground">원하는 결제 수단을 선택합니다.</p>
      </div>

      <Tabs value={payMethod} onValueChange={setPayMethod}>
        <TabsList className="grid w-full grid-cols-3">
          {PAY_METHODS.map((m) => (
            <TabsTrigger key={m.key} value={m.key}>
              {m.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="rounded-xl border p-4">
        <p className="m-0 mb-2 text-sm font-semibold">유료 입장권 결제</p>
        <p className="m-0 mb-4 text-sm leading-relaxed text-muted-foreground">
          &apos;결제하기&apos; 클릭 시 실제 PortOne 결제창이 새로 열립니다. 카드/계좌 정보는 그 결제창에서 직접
          입력합니다. 테스트 채널로 연결되어 있어 실제 대금은 빠져나가지 않습니다.
        </p>
        <Label className="cursor-pointer items-start font-normal leading-snug">
          <Checkbox checked={agree} onCheckedChange={(v) => setAgree(v === true)} className="mt-0.5" />
          <span>
            결제 내용을 확인하였으며, 이에 동의합니다. (필수)
            <br />
            <a href="#!" onClick={(e) => e.preventDefault()} className="text-xs text-muted-foreground underline">
              이용약관 보기
            </a>
          </span>
        </Label>
      </div>

      {payError && <p className="m-0 text-sm text-destructive">{payError}</p>}

      <Button size="lg" disabled={!canPay} onClick={onPaid}>
        {paying ? '결제 처리 중...' : `₩${amount.toLocaleString()} 결제하기`}
      </Button>
    </>
  );
}

function PaySummary({ amount, payMethod }) {
  return (
    <InfoList
      items={[
        { label: '결제 일시', value: nowLabel() },
        { label: '결제 수단', value: PAY_METHODS.find((m) => m.key === payMethod)?.label ?? payMethod },
        { label: '결제 금액', value: `₩${amount.toLocaleString()}` },
      ]}
    />
  );
}

function PayDone({ amount, payMethod, onCheckQr, onLookAround }) {
  return (
    <>
      <StepIntro icon={<Check />} title="결제가 완료되었습니다!" desc="입장용 QR이 발급되었습니다." />
      <PaySummary amount={amount} payMethod={payMethod} />
      <StepActions>
        <Button size="lg" onClick={onCheckQr}>QR 확인하기</Button>
        <Button size="lg" variant="outline" onClick={onLookAround}>박람회 둘러보기</Button>
      </StepActions>
    </>
  );
}

// 결제(PAID)는 완료됐지만 Reservation 쪽 QR 발급이 실패한 예외 상황 전용 안내 화면.
// 돈은 이미 냈으므로 "실패"가 아니라 "결제는 됐는데 QR이 아직 없다"를 정확히 전달하고,
// 재발급 API가 따로 없어 지금은 마이페이지 재확인 + 고객센터 안내만 제공한다.
function PayIssueFailed({ amount, payMethod, onMyPage, onLookAround }) {
  return (
    <>
      <StepIntro
        icon={<CircleAlert className="text-destructive" />}
        title="결제는 완료됐지만 QR 발급에 실패했어요"
        desc="결제 금액은 정상 처리됐지만 입장권(QR) 발급 중 일시적인 오류가 발생했습니다. 잠시 후 마이페이지에서 다시 확인해주세요. 계속 보이지 않으면 고객센터로 문의해주시면 결제 내역을 확인해 QR을 재발급해드립니다."
      />
      <PaySummary amount={amount} payMethod={payMethod} />
      <StepActions>
        <Button size="lg" onClick={onMyPage}>마이페이지에서 확인하기</Button>
        <Button size="lg" variant="outline" onClick={onLookAround}>박람회 둘러보기</Button>
      </StepActions>
    </>
  );
}

function GuestInfo({ onLookAround, onLogin }) {
  return (
    <>
      <StepIntro icon={<Eye />} title="박람회 정보를 둘러볼까요?" desc="로그인 없이도 참가업체, 차량 정보를 확인할 수 있습니다." />
      <BulletList
        items={['차량 상세 정보, 부스 위치 확인 가능', '상담 신청을 원하시면 로그인 후 이용해주세요.', '입장권은 현장에서 구매할 수 있습니다.']}
      />
      <StepActions>
        <Button size="lg" onClick={onLookAround}>박람회 둘러보기</Button>
        <Button size="lg" variant="outline" onClick={onLogin}>로그인하고 더 많은 기능 이용하기</Button>
      </StepActions>
    </>
  );
}

export default EntryFlowModal;
