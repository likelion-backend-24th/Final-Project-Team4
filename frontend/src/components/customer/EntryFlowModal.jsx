import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as PortOne from '@portone/browser-sdk/v2';
import QrPlaceholder from './QrPlaceholder';
import { addMyTicket } from '../../mock/customerData';
import { isLoggedIn } from '../../api/auth';
import { payAdmission } from '../../api/payment';
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

function buildTicket(expo, extra = {}) {
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
    ...extra,
  };
}

// 박람회 목록에서 "선택하기"를 눌렀을 때 뜨는 입장 방법 선택 팝업 + 이어지는 전체 플로우.
//
// - "당일 입장권 구매"는 실제 PortOne 결제 + 백엔드 POST /api/customer/admission-payments로 연동됨
//   (payment 서비스 TASK 5-6~5-8). 결제 자체는 실제로 처리되지만, 결제 이후 발급되는 QR/티켓 상세
//   조회 API는 Reservation 쪽에 아직 없어서(TASK 5-8 이슈에도 "API 확정 후 링크"로 명시), 결제 완료
//   화면과 QR 이미지는 기존처럼 화면 확인용으로 만든 티켓 객체를 그대로 보여줌.
// - "QR 사전 입장"(이미 구매한 입장권 인증)과 "로그인 없이 둘러보기"는 조회할 실제 백엔드 API가
//   아직 없어서(예매번호로 티켓 조회하는 API 미구현) 이번엔 그대로 목업으로 남겨둠.
function EntryFlowModal({ expo, onClose }) {
  const navigate = useNavigate();
  const [step, setStep] = useState('choose');
  const [authTab, setAuthTab] = useState('scan');
  const [bookingCode, setBookingCode] = useState('');
  const [payMethod, setPayMethod] = useState('card');
  const [agree, setAgree] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState(null);
  const [paidInfo, setPaidInfo] = useState(null);

  const admissionFee = expo.admissionFee ?? 0;

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

  // 당일 입장료가 0원인 박람회는 결제 없이 바로 발급 (US17/US18: 0이면 당일에도 무료)
  const handleBuyTicket = () => {
    if (!isLoggedIn()) {
      setStep('login-required');
      return;
    }
    if (admissionFee <= 0) {
      setPaidInfo({ amount: 0, payMethod: '무료', paidAt: nowLabel() });
      setStep('pay-done');
      return;
    }
    setStep('payment');
  };

  const handlePay = async () => {
    setPayError(null);
    setPaying(true);
    // 결제 건마다 고유해야 하는 ID. PortOne 결제창과 우리 서버 양쪽에 동일한 값을 사용해서
    // 서버가 나중에 "이 ID로 결제된 게 진짜 맞는지" PortOne에 재확인할 수 있게 함.
    const paymentId = `admission-${crypto.randomUUID()}`;
    try {
      // 1. PortOne 결제창 호출 (실제 결제창이 뜸. 테스트 채널이라 실제 대금은 빠져나가지 않음)
      const response = await PortOne.requestPayment({
        storeId: PORTONE_STORE_ID,
        channelKey: PORTONE_CHANNEL_KEY,
        paymentId,
        orderName: `${expo.title} 당일 입장권`,
        totalAmount: admissionFee,
        currency: 'CURRENCY_KRW',
        payMethod: PAY_METHOD_CODE[payMethod],
        redirectUrl: `${window.location.origin}/customer/expos`,
      });

      if (response.code) {
        setPayError(response.message ?? '결제가 취소되었거나 실패했습니다.');
        setPaying(false);
        return;
      }

      // 2. 결제창에서 처리된 결제 건을 우리 서버가 PortOne에 재조회해서 검증하고 저장
      await payAdmission({
        expoId: expo.expoId,
        amount: admissionFee,
        payMethod: PAY_METHOD_CODE[payMethod],
        paymentId,
      });

      setPaidInfo({ amount: admissionFee, payMethod, paidAt: nowLabel() });
      setStep('pay-done');
    } catch (err) {
      setPayError(err.response?.data?.error?.message ?? '결제 처리 중 오류가 발생했습니다.');
    } finally {
      setPaying(false);
    }
  };

  const issueFromPurchase = () => {
    const t = buildTicket(expo, { purchasedAt: paidInfo?.paidAt ?? nowLabel() });
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
            onBuyTicket={handleBuyTicket}
            onGuest={() => setStep('guest-info')}
          />
        )}

        {step === 'login-required' && (
          <LoginRequired onLogin={goLogin} onGuest={() => setStep('guest-info')} />
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
            amount={admissionFee}
            payMethod={payMethod}
            setPayMethod={setPayMethod}
            agree={agree}
            setAgree={setAgree}
            paying={paying}
            payError={payError}
            onPaid={handlePay}
          />
        )}

        {step === 'pay-done' && paidInfo && (
          <PayDone paidInfo={paidInfo} onCheckQr={issueFromPurchase} onLookAround={goDetail} />
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
      <p className="c-modal__desc">당일 입장권 결제는 로그인한 회원만 이용할 수 있습니다.</p>
      <button type="button" className="c-modal__primary" onClick={onLogin}>
        로그인하러 가기
      </button>
      <button type="button" className="c-modal__secondary" onClick={onGuest}>
        로그인 없이 둘러보기
      </button>
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
        <p className="ef-card-form__title">당일 입장권 결제</p>
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

function PayDone({ paidInfo, onCheckQr, onLookAround }) {
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
          <dd>{paidInfo.paidAt}</dd>
        </div>
        <div className="c-modal__info-row">
          <dt>결제 수단</dt>
          <dd>{PAY_METHODS.find((m) => m.key === paidInfo.payMethod)?.label ?? paidInfo.payMethod}</dd>
        </div>
        <div className="c-modal__info-row">
          <dt>결제 금액</dt>
          <dd>₩{paidInfo.amount.toLocaleString()}</dd>
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