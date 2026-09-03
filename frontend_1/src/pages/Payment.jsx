import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { payBooking } from '../api/payment';
import './Payment.css';

const METHODS = ['신용카드', '실시간 계좌이체', '가상계좌 발급'];
const METHOD_CODE = {
  신용카드: 'CARD',
  '실시간 계좌이체': 'TRANSFER',
  '가상계좌 발급': 'VBANK',
};

// 백엔드가 아직 가짜 예약 데이터(StubBookingClient)를 쓰고 있어서,
// applicationId(=bookingId)는 1, 2, 3 중 하나여야 응답이 와요.
// 1번: 승인됨, 합계 500,000원 (정상 결제 데모용)
const DEMO_AMOUNT = 500000;

function Payment() {
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const [method, setMethod] = useState('신용카드');
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState(null);

  const handlePay = async () => {
    setPaying(true);
    setError(null);
    try {
      await payBooking({
        bookingId: Number(applicationId),
        userId: 100, // 로그인 연동 전이라 임시 고정값
        amount: DEMO_AMOUNT,
        payMethod: METHOD_CODE[method],
      });
      alert('테스트 결제가 완료되었습니다. (Mock)');
      navigate('/mypage');
    } catch (err) {
      setError(err.response?.data?.error?.message ?? '결제 처리 중 오류가 발생했습니다.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="payment">
      <section className="payment__hero">
        <p className="payment__eyebrow">EXHIBITOR MANAGEMENT PORTAL</p>
        <h1>참가비 결제</h1>
        <p>참가 신청 승인이 완료된 박람회의 부스 임차 및 참가 비용을 안전하게 결제합니다.</p>
      </section>

      <div className="payment__body">
        <div className="payment__main">
          <section className="payment__panel">
            <h2>결제 수단 선택</h2>
            <div className="payment__methods">
              {METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={m === method ? 'is-active' : ''}
                  onClick={() => setMethod(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </section>

          {method === '신용카드' && (
            <section className="payment__panel">
              <div className="payment__panel-header">
                <h2>카드 정보 입력 (Mock 테스트용)</h2>
                <span className="payment__test-tag">테스트 환경</span>
              </div>
              <label>카드 번호</label>
              <div className="payment__card-number">
                <input placeholder="••••" maxLength={4} />
                <input placeholder="••••" maxLength={4} />
                <input placeholder="••••" maxLength={4} />
                <input placeholder="1234" maxLength={4} />
              </div>
              <div className="payment__grid">
                <label>
                  유효기간 (MM/YY)
                  <input placeholder="MM / YY" />
                </label>
                <label>
                  CVC 번호
                  <input placeholder="카드 뒷면 3자리 숫자" />
                </label>
              </div>
              <p className="payment__notice">
                안내: 해당 결제 단계는 테스트 시뮬레이션 환경으로 실 결제는 발생하지 않으며, '결제하기' 클릭 시
                결제 성공으로 자동 처리됩니다.
              </p>
            </section>
          )}
        </div>

        <aside className="payment__side">
          <h3>청구 내역 요약</h3>
          <p className="payment__label">신청 박람회</p>
          <p className="payment__value">2026 서울 모빌리티 엑스포 (Seoul Mobility Expo)</p>

          <div className="payment__row">
            <span>배정 부스 번호</span>
            <strong>A-105</strong>
          </div>
          <div className="payment__row">
            <span>신청 부스 크기</span>
            <strong>3m x 3m (9㎡) / 조립형</strong>
          </div>
          <div className="payment__row">
            <span>전력 지원 (무료 제공)</span>
            <strong>기본 1kW</strong>
          </div>

          <div className="payment__total">
            <span>최종 청구 금액</span>
            <strong>₩{DEMO_AMOUNT.toLocaleString()}</strong>
          </div>

          {error && (
            <p className="payment__notice" style={{ color: '#d33' }}>
              {error}
            </p>
          )}

          <button type="button" className="payment__cta" onClick={handlePay} disabled={paying}>
            {paying ? '결제 처리 중...' : `₩${DEMO_AMOUNT.toLocaleString()} 안전 결제하기`}
          </button>
          <button type="button" className="payment__cancel" onClick={() => navigate('/mypage')}>
            결제 취소
          </button>
        </aside>
      </div>
    </div>
  );
}

export default Payment;