import { useEffect, useState } from 'react';
import { getAdmissionTicketPaymentDetail } from '../../api/payment';
import { downloadReceiptImage } from '../../utils/downloadImage';
import { AppDialog, InfoList } from '@/components/layout/AppDialog';
import { Button } from '@/components/ui/button';

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

  const items = detail
    ? [
        { label: '결제 금액', value: fmtWon(detail.amount) },
        { label: '결제 상태', value: STATUS_LABEL[detail.status] ?? detail.status },
        { label: '결제 일시', value: fmtDateTime(detail.paidAt) },
        { label: '결제 수단', value: detail.payMethod ?? '-' },
        { label: '결제 번호', value: detail.paymentNo ?? '-' },
        ...(detail.refundedAt ? [{ label: '환불 일시', value: fmtDateTime(detail.refundedAt) }] : []),
      ]
    : [];

  return (
    <AppDialog
      onClose={onClose}
      title="결제 내역"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
          <Button onClick={handleDownload} disabled={!detail}>
            다운받기
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-4">
        <div className="size-24 shrink-0 overflow-hidden rounded-lg border bg-muted">
          {ticket.qrImageBase64 && (
            <img src={`data:image/png;base64,${ticket.qrImageBase64}`} alt="입장 QR 코드" className="size-full" />
          )}
        </div>
        <p className="m-0 text-sm leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">{ticket.expoTitle}</span>
          <br />
          {ticket.holderName}님 당일 입장권 · 1인
          <br />
          예매번호 {ticket.bookingNo}
        </p>
      </div>

      {error ? (
        <p className="m-0 text-sm text-destructive">{error}</p>
      ) : !detail ? (
        <p className="m-0 text-sm text-muted-foreground">불러오는 중...</p>
      ) : (
        <InfoList items={items} />
      )}
    </AppDialog>
  );
}

export default PaymentDetailModal;
