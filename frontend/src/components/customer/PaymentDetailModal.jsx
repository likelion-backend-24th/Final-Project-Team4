import { useEffect, useState } from 'react';
import { getAdmissionTicketPaymentDetail } from '../../api/payment';
import { downloadReceiptImage } from '../../utils/downloadImage'
import './Modal.css';

const fmtDateTime = (iso) => (iso ? iso.replace('T', ' ').slice(0, 16) : '-');
const fmtWon = (n) => (typeof n === 'number' ? `${n.toLocaleString()}원` : '-');

const STATUS_LABEL = {
  PAID: '결제 완료',
  CANCELLED: '결제 취소',
  REFUNDED: '환불 완료',
  FAILED: '결제 실패',
  PENDING: '결제 대기',
};

// 마이페이지 "나의 입장권" > "..." > 결제 내역 보기.
// ticket: CustomerMyPage에서 넘겨주는 화면 표시용 티켓 객체(QR/예매번호/이용자명 등은 여기 있는 걸 그대로 씀).
// 결제 금액·상태·결제수단·결제번호처럼 Payment 서비스에만 있는 값만 API로 따로 조회한다.
function PaymentDetailModal({ ticket, onClose }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getAdmissionTicketPaymentDetail(ticket.ticketId)
      .then(setDetail)
      .catch((err) => setError(err.response?.data?.error?.message ?? '결제 내역을 불러오지 못했습니다.'));
  }, [ticket.ticketId]);

  const handleDownload = () => {
  if (!detail) return;
  const lines = [
    `예매번호 ${ticket.bookingNo}`,
    `결제 금액 ${fmtWon(detail.amount)}`,
    `결제 상태 ${STATUS_LABEL[detail.status] ?? detail.status}`,
    `결제 일시 ${fmtDateTime(detail.paidAt)}`,
    `결제 수단 ${detail.payMethod ?? '-'}`,
    `결제 번호 ${detail.paymentNo ?? '-'}`,
    ...(detail.refundedAt ? [`환불 일시 ${fmtDateTime(detail.refundedAt)}`] : []),
  ];
  downloadReceiptImage(ticket.expoTitle || '결제 내역', lines, `결제내역_${ticket.bookingNo}`);
};
  
  return (
    <div className="c-modal__backdrop" onClick={onClose}>
      <div className="c-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="c-modal__close" onClick={onClose} aria-label="닫기">
          ✕
        </button>
        <h2>결제 내역</h2>

        <div className="c-modal__qr" style={{ width: 96, height: 96 }}>
          {ticket.qrImageBase64 && (
            <img src={`data:image/png;base64,${ticket.qrImageBase64}`} alt="입장 QR 코드" />
          )}
        </div>
        <p className="c-modal__desc" style={{ margin: '0 0 20px' }}>
          {ticket.expoTitle}
          <br />
          {ticket.holderName}님 당일 입장권 · 1인
          <br />
          예매번호 {ticket.bookingNo}
        </p>

        {error ? (
          <p className="c-modal__error">{error}</p>
        ) : !detail ? (
          <p className="c-modal__desc">불러오는 중...</p>
        ) : (
          <dl className="c-modal__info">
            <div className="c-modal__info-row">
              <dt>결제 금액</dt>
              <dd>{fmtWon(detail.amount)}</dd>
            </div>
            <div className="c-modal__info-row">
              <dt>결제 상태</dt>
              <dd>{STATUS_LABEL[detail.status] ?? detail.status}</dd>
            </div>
            <div className="c-modal__info-row">
              <dt>결제 일시</dt>
              <dd>{fmtDateTime(detail.paidAt)}</dd>
            </div>
            <div className="c-modal__info-row">
              <dt>결제 수단</dt>
              <dd>{detail.payMethod ?? '-'}</dd>
            </div>
            <div className="c-modal__info-row">
              <dt>결제 번호</dt>
              <dd>{detail.paymentNo ?? '-'}</dd>
            </div>
            {detail.refundedAt && (
              <div className="c-modal__info-row">
                <dt>환불 일시</dt>
                <dd>{fmtDateTime(detail.refundedAt)}</dd>
              </div>
            )}
          </dl>
        )}

        <button type="button" className="c-modal__primary" onClick={handleDownload} disabled={!detail}>
          다운받기
        </button>
        <button type="button" className="c-modal__secondary" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}

export default PaymentDetailModal;