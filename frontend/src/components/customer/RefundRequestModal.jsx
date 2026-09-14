import { useEffect, useState } from 'react';
import { getAdmissionTicketPaymentDetail, refundAdmissionTicket } from '../../api/payment';
import { REFUND_REASONS } from '../../mock/customerData';
import './Modal.css';

const fmtDateTime = (iso) => (iso ? iso.replace('T', ' ').slice(0, 16) : '-');
const fmtWon = (n) => (typeof n === 'number' ? `${n.toLocaleString()}원` : '-');

// 마이페이지 "나의 입장권" > "..." > 환불 신청.
// step 'confirm' -> 결제 내역 + 사유 선택 -> 'done' -> 완료 화면. 실제 환불 가능 여부(이미 체크인됨/
// 방문일 지남/이미 환불됨 등)는 전부 백엔드가 최종 판정하므로, 여기서는 그 에러 메시지를 그대로 보여준다.
function RefundRequestModal({ ticket, onClose, onRefunded }) {
  const [step, setStep] = useState('confirm');
  const [detail, setDetail] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [reason, setReason] = useState(REFUND_REASONS[0].value);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    getAdmissionTicketPaymentDetail(ticket.ticketId)
      .then(setDetail)
      .catch((err) => setLoadError(err.response?.data?.error?.message ?? '결제 내역을 불러오지 못했습니다.'));
  }, [ticket.ticketId]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const refund = await refundAdmissionTicket({ ticketId: ticket.ticketId, reason });
      setResult(refund);
      setStep('done');
      onRefunded?.();
    } catch (err) {
      setSubmitError(err.response?.data?.error?.message ?? '환불 신청 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'done') {
    return (
      <div className="c-modal__backdrop" onClick={onClose}>
        <div className="c-modal" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="c-modal__close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
          <div className="c-modal__icon" style={{ background: '#f0fdf4' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
              <path d="M4 12l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2>환불 신청이 완료되었습니다.</h2>
          <p className="c-modal__desc">
            환불 처리는 영업일 기준 1~3일 소요되며,
            <br />
            완료 시 문자로 안내드립니다.
          </p>
          <dl className="c-modal__info">
            <div className="c-modal__info-row">
              <dt>예매번호</dt>
              <dd>{ticket.bookingNo}</dd>
            </div>
            <div className="c-modal__info-row">
              <dt>신청일</dt>
              <dd>{fmtDateTime(result?.refundedAt)}</dd>
            </div>
          </dl>
          <button type="button" className="c-modal__primary" onClick={onClose}>
            확인
          </button>
        </div>
      </div>
    );
  }

  const amount = detail?.amount;
  const fee = 0;
  const expected = typeof amount === 'number' ? amount - fee : null;

  return (
    <div className="c-modal__backdrop" onClick={() => !submitting && onClose()}>
      <div className="c-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="c-modal__close"
          onClick={onClose}
          disabled={submitting}
          aria-label="닫기"
        >
          ✕
        </button>
        <h2>환불 신청</h2>
        <p className="c-modal__desc" style={{ marginBottom: 16 }}>
          {ticket.expoTitle}
          <br />
          {ticket.holderName}님 당일 입장권 · 1인
          <br />
          예매번호 {ticket.bookingNo}
        </p>

        {loadError ? (
          <p className="c-modal__error">{loadError}</p>
        ) : !detail ? (
          <p className="c-modal__desc">불러오는 중...</p>
        ) : (
          <>
            <dl className="c-modal__info">
              <div className="c-modal__info-row">
                <dt>결제 금액</dt>
                <dd>{fmtWon(amount)}</dd>
              </div>
              <div className="c-modal__info-row">
                <dt>환불 수수료</dt>
                <dd>{fmtWon(fee)}</dd>
              </div>
              <div className="c-modal__info-row">
                <dt>예상 환불 금액</dt>
                <dd>{fmtWon(expected)}</dd>
              </div>
            </dl>

            <label className="ef-field">
              <span>환불 사유 *</span>
              <select value={reason} onChange={(e) => setReason(e.target.value)}>
                {REFUND_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="c-modal__note">
              <span className="c-modal__note-icon" />
              <span>
                환불이 완료되면 발급된 입장 QR은 즉시 사용할 수 없습니다.
                <br />
                환불 처리 기간은 영업일 기준 1~3일 소요될 수 있습니다.
              </span>
            </div>

            {submitError && <p className="c-modal__error">{submitError}</p>}

            <button
              type="button"
              className="c-modal__primary c-modal__primary--danger"
              style={{ marginTop: 16 }}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? '처리 중...' : '환불 신청'}
            </button>
          </>
        )}
        <button type="button" className="c-modal__secondary" onClick={onClose} disabled={submitting}>
          취소
        </button>
      </div>
    </div>
  );
}

export default RefundRequestModal;