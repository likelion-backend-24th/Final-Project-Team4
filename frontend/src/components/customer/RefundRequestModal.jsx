import { Check, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { getAdmissionTicketPaymentDetail, refundAdmissionTicket } from '../../api/payment';
import { REFUND_REASONS } from '../../mock/customerData';
import { SelectField } from '../form/fields';
import { AppDialog, InfoList } from '@/components/layout/AppDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';

const fmtDateTime = (iso) => (iso ? iso.replace('T', ' ').slice(0, 16) : '-');
const fmtWon = (n) => (typeof n === 'number' ? `${n.toLocaleString()}원` : '-');

// 마이페이지 "나의 입장권" > "..." > 환불 신청.
// step 'confirm' -> 결제 내역 + 사유 선택 -> 'done' -> 완료 화면. 실제 환불 가능 여부(이미 체크인됨/
// 방문일 지남/이미 환불됨 등)는 전부 백엔드가 최종 판정하므로, 여기서는 그 에러 메시지를 그대로 보여준다.
function RefundRequestModal({ ticket, onClose, onRefunded }) {
  const [step, setStep] = useState('confirm');
  const [detail, setDetail] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [result, setResult] = useState(null);
  const form = useForm({ defaultValues: { reason: REFUND_REASONS[0].value } });

  useEffect(() => {
    getAdmissionTicketPaymentDetail(ticket.ticketId)
      .then(setDetail)
      .catch((err) => setLoadError(err.response?.data?.error?.message ?? '결제 내역을 불러오지 못했습니다.'));
  }, [ticket.ticketId]);

  const handleSubmit = async ({ reason }) => {
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
      <AppDialog
        onClose={onClose}
        icon={<Check className="text-green-600" />}
        title="환불 신청이 완료되었습니다."
        description="환불 처리는 영업일 기준 1~3일 소요되며, 완료 시 문자로 안내드립니다."
        centered
        footer={<Button onClick={onClose}>확인</Button>}
      >
        <InfoList
          items={[
            { label: '예매번호', value: ticket.bookingNo },
            { label: '신청일', value: fmtDateTime(result?.refundedAt) },
          ]}
        />
      </AppDialog>
    );
  }

  const amount = detail?.amount;
  const fee = 0;
  const expected = typeof amount === 'number' ? amount - fee : null;

  return (
    <AppDialog
      onClose={() => !submitting && onClose()}
      dismissible={!submitting}
      title="환불 신청"
      description={`${ticket.expoTitle} · ${ticket.holderName}님 당일 입장권 · 1인 · 예매번호 ${ticket.bookingNo}`}
    >
      {loadError ? (
        <p className="m-0 text-sm text-destructive">{loadError}</p>
      ) : !detail ? (
        <p className="m-0 text-sm text-muted-foreground">불러오는 중...</p>
      ) : (
        <Form {...form}>
          <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(handleSubmit)}>
            <InfoList
              items={[
                { label: '결제 금액', value: fmtWon(amount) },
                { label: '환불 수수료', value: fmtWon(fee) },
                { label: '예상 환불 금액', value: fmtWon(expected) },
              ]}
            />

            <SelectField control={form.control} name="reason" label="환불 사유" required options={REFUND_REASONS} />

            <Alert>
              <Info />
              <AlertDescription>
                환불이 완료되면 발급된 입장 QR은 즉시 사용할 수 없습니다. 환불 처리 기간은 영업일 기준 1~3일 소요될 수 있습니다.
              </AlertDescription>
            </Alert>

            {submitError && <p className="m-0 text-sm text-destructive">{submitError}</p>}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                취소
              </Button>
              <Button type="submit" variant="destructive" disabled={submitting}>
                {submitting ? '처리 중...' : '환불 신청'}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </AppDialog>
  );
}

export default RefundRequestModal;
