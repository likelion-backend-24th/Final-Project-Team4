import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import ConsultationLoadingOverlay from './ConsultationLoadingOverlay';
import { CONSULTATION_TIME_SLOTS } from '../../utils/customerData';
import { cancelConsultation, getConsultationSlotAvailability, updateConsultation } from '../../api/expo';
import { getMyReservations } from '../../api/reservation';
import { buildCalendar, toIsoDate, WEEKDAYS } from '../../utils/calendar';
import { CheckboxField, TextareaField, TextField } from '../form/fields';
import { AppDialog, InfoList } from '@/components/layout/AppDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { cn } from '@/lib/utils';

const STATUS_LABEL = {
  REQUESTED: '대기',
  APPROVED: '승인',
  REJECTED: '반려',
  CANCELED: '취소함',
  COMPLETED: '상담 완료',
  NO_SHOW: '미방문 처리됨',
};

const STATUS_BADGE = {
  REQUESTED: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELED: 'bg-slate-100 text-slate-600',
  COMPLETED: 'bg-blue-100 text-blue-700',
  NO_SHOW: 'bg-slate-100 text-slate-600',
};

function FieldError({ children }) {
  return children ? <p className="m-0 mt-1 text-sm text-destructive">{children}</p> : null;
}

function Block({ label, children }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <p className="m-0 mt-1 whitespace-pre-wrap text-sm">{children}</p>
    </div>
  );
}

// 고객 마이페이지 - 신청한 상담 1건 상세 조회 + (대기 중일 때만) 수정/취소.
function ConsultationDetailModal({ consultation, reviewed = false, onClose, onChanged }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState('view'); // 'view' | 'edit'
  const editable = consultation.status === 'REQUESTED';

  const goWriteReview = () => {
    const params = new URLSearchParams({ writeReview: 'CONSULT', consultationId: consultation.consultationId });
    if (consultation.interestedVehicle) params.set('vehicleName', consultation.interestedVehicle);
    navigate(`/customer/expos/${consultation.expoId}/booths/${consultation.boothId}?${params.toString()}`);
  };

  const initialDate = new Date(`${consultation.preferredDate}T00:00:00`);
  const form = useForm({
    defaultValues: {
      wantsPurchase: consultation.wantsPurchase,
      wantsTestDrive: consultation.wantsTestDrive,
      interestedVehicle: consultation.interestedVehicle ?? '',
      hasDriverLicense: consultation.hasDriverLicense,
      message: consultation.message ?? '',
      leadConsent: consultation.leadConsent ?? false,
    },
  });
  const wantsPurchase = form.watch('wantsPurchase');
  const wantsTestDrive = form.watch('wantsTestDrive');
  const leadConsent = form.watch('leadConsent');

  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const [selectedDay, setSelectedDay] = useState(initialDate.getDate());
  const [selectedTime, setSelectedTime] = useState(consultation.preferredTime?.slice(0, 5) ?? null);
  const [ticketDates, setTicketDates] = useState(new Set());
  const [slotAvailability, setSlotAvailability] = useState(null); // 선택한 날짜의 시간대별 정원/신청 건수

  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const calendarCells = useMemo(() => buildCalendar(viewYear, viewMonth), [viewYear, viewMonth]);

  useEffect(() => {
    if (mode !== 'edit') return;
    getMyReservations()
      .then((tickets) => {
        const dates = tickets.filter((t) => String(t.expoId) === String(consultation.expoId)).map((t) => t.visitDate);
        setTicketDates(new Set(dates));
      })
      .catch(() => setTicketDates(new Set()));
  }, [mode, consultation.expoId]);

  // 수정 화면에서 날짜를 고르면 그 날짜의 시간대별 정원을 조회해 마감된 시간대를 막는다(서버도 같은 기준으로 막는다).
  useEffect(() => {
    if (mode !== 'edit' || !selectedDay) {
      setSlotAvailability(null);
      return undefined;
    }
    let cancelled = false;
    getConsultationSlotAvailability(consultation.boothId, toIsoDate(viewYear, viewMonth, selectedDay))
      .then((data) => {
        if (!cancelled) setSlotAvailability(data);
      })
      .catch(() => {
        if (!cancelled) setSlotAvailability(null);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, selectedDay, viewYear, viewMonth, consultation.boothId]);

  // 남은 자리 수(정보가 없으면 제한 없음). 내가 이미 차지한 원래 슬롯은 자리 하나를 돌려받은 것으로 본다.
  const slotRemaining = (slot) => {
    if (!slotAvailability) return Infinity;
    const found = slotAvailability.slots.find((x) => x.time.slice(0, 5) === slot);
    const own =
      toIsoDate(viewYear, viewMonth, selectedDay) === consultation.preferredDate &&
      slot === consultation.preferredTime?.slice(0, 5)
        ? 1
        : 0;
    return (found?.capacity ?? slotAvailability.defaultCapacity) - (found?.booked ?? 0) + own;
  };

  useEffect(() => {
    if (selectedTime && slotRemaining(selectedTime) <= 0) setSelectedTime(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotAvailability]);

  const clearFieldError = (field) =>
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  const goToPrevMonth = () => {
    setSelectedDay(null);
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    setSelectedDay(null);
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleCancel = () => {
    const confirmed = window.confirm('이 상담 신청을 취소할까요?');
    if (!confirmed) return;
    setSubmitting(true);
    setError(null);
    cancelConsultation(consultation.consultationId)
      .then(() => {
        onChanged();
        onClose();
      })
      .catch((err) => setError(err.response?.data?.error?.message ?? '취소 처리 중 오류가 발생했습니다.'))
      .finally(() => setSubmitting(false));
  };

  const handleSave = (values) => {
    const errors = {};
    if (!values.wantsPurchase && !values.wantsTestDrive) errors.consultType = '상담 유형을 하나 이상 선택해주세요.';
    if (!selectedDay) errors.date = '방문 희망 날짜를 선택해주세요.';
    else if (!selectedTime) errors.time = '방문 희망 시간을 선택해주세요.';
    if (!values.leadConsent) errors.leadConsent = '연락처 제공 동의는 필수입니다.';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    setError(null);
    updateConsultation(consultation.consultationId, {
      wantsPurchase: values.wantsPurchase,
      wantsTestDrive: values.wantsTestDrive,
      interestedVehicle: values.interestedVehicle.trim() || null,
      hasDriverLicense: values.hasDriverLicense,
      preferredDate: toIsoDate(viewYear, viewMonth, selectedDay),
      preferredTime: `${selectedTime}:00`,
      message: values.message.trim() || null,
      leadConsent: values.leadConsent,
    })
      .then(() => {
        onChanged();
        onClose();
      })
      .catch((err) => setError(err.response?.data?.error?.message ?? '수정 중 오류가 발생했습니다.'))
      .finally(() => setSubmitting(false));
  };

  if (submitting && mode === 'edit') {
    return <ConsultationLoadingOverlay />;
  }

  const typeLabel = [consultation.wantsPurchase && '구매', consultation.wantsTestDrive && '시승'].filter(Boolean).join(' + ');

  const viewBody = (
    <>
      <InfoList
        items={[
          { label: '관심 차종', value: consultation.interestedVehicle || '-' },
          { label: '상담 유형', value: typeLabel },
          ...(consultation.wantsTestDrive
            ? [{ label: '운전면허 소지', value: consultation.hasDriverLicense ? '소지' : '미소지' }]
            : []),
          { label: '희망 방문일', value: `${consultation.preferredDate} ${consultation.preferredTime?.slice(0, 5) ?? ''}` },
          { label: 'QR 연락처 제공 동의', value: consultation.leadConsent ? '동의함' : '동의 안 함' },
        ]}
      />

      {consultation.message && <Block label="요청사항">{consultation.message}</Block>}
      {consultation.status === 'REJECTED' && consultation.rejectReason && (
        <Block label="반려 사유">{consultation.rejectReason}</Block>
      )}

      {consultation.status === 'NO_SHOW' && (
        <p className="m-0 text-sm text-muted-foreground">참가업체가 미방문으로 처리한 상담입니다.</p>
      )}

      {consultation.reviewable && !reviewed && (
        <Button type="button" onClick={goWriteReview}>
          후기 작성하러 가기
        </Button>
      )}
      {consultation.reviewable && reviewed && (
        <p className="m-0 text-sm text-muted-foreground">
          이미 후기를 작성한 상담입니다. 내정보의 &quot;내가 쓴 후기&quot;에서 확인할 수 있어요.
        </p>
      )}

      {editable ? (
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => setMode('edit')}>
            수정
          </Button>
          <Button type="button" variant="destructive" className="flex-1" disabled={submitting} onClick={handleCancel}>
            {submitting ? '처리 중...' : '신청 취소'}
          </Button>
        </div>
      ) : (
        <p className="m-0 text-sm text-muted-foreground">이미 처리된 상담은 수정·취소할 수 없습니다.</p>
      )}
      <FieldError>{error}</FieldError>
    </>
  );

  const editBody = (
    <Form {...form}>
      <form className="flex flex-col gap-5" onSubmit={form.handleSubmit(handleSave)} noValidate>
        <div>
          <p className="m-0 mb-1.5 text-sm font-medium">
            상담 유형<span className="ml-0.5 text-destructive">*</span> (최소 1개 선택)
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { name: 'wantsPurchase', label: '구매 상담', on: wantsPurchase },
              { name: 'wantsTestDrive', label: '시승 상담', on: wantsTestDrive },
            ].map(({ name, label, on }) => (
              <Button
                key={name}
                type="button"
                variant={on ? 'default' : 'outline'}
                onClick={() => {
                  form.setValue(name, !on);
                  clearFieldError('consultType');
                }}
              >
                {label}
              </Button>
            ))}
          </div>
          <FieldError>{fieldErrors.consultType}</FieldError>
        </div>

        <TextField control={form.control} name="interestedVehicle" label="관심 차종" placeholder="예: EV6, 아이오닉5 (선택)" />

        {wantsTestDrive && (
          <CheckboxField control={form.control} name="hasDriverLicense" label="시승을 위한 운전면허를 소지하고 있습니다." />
        )}

        <div>
          <p className="m-0 mb-1.5 text-sm font-medium">
            방문 희망 날짜<span className="ml-0.5 text-destructive">*</span>
          </p>
          <p className="m-0 mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-3 rounded bg-blue-100" /> 보유한 입장권 날짜입니다. 입장권이 없는 날짜는 선택할 수 없습니다.
          </p>
          <div className="rounded-xl border p-3">
            <div className="mb-2 flex items-center justify-between">
              <Button type="button" variant="ghost" size="icon-sm" onClick={goToPrevMonth} aria-label="이전 달">
                <ChevronLeft />
              </Button>
              <strong className="text-sm">
                {viewYear}년 {viewMonth + 1}월
              </strong>
              <Button type="button" variant="ghost" size="icon-sm" onClick={goToNextMonth} aria-label="다음 달">
                <ChevronRight />
              </Button>
            </div>
            <div className="mb-1 grid grid-cols-7 text-center text-[11px] text-muted-foreground">
              {WEEKDAYS.map((w) => (
                <span key={w} className="py-1">{w}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {calendarCells.map((d, i) => {
                const iso = d ? toIsoDate(viewYear, viewMonth, d) : null;
                const hasTicket = d && (ticketDates.has(iso) || iso === consultation.preferredDate);
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!d || !hasTicket}
                    className={cn(
                      'aspect-square rounded-md border-0 bg-transparent text-[13px] transition-colors enabled:cursor-pointer',
                      hasTicket && 'bg-blue-100 font-semibold text-blue-700 enabled:hover:bg-blue-200',
                      !hasTicket && 'text-muted-foreground',
                      d && d === selectedDay && 'bg-primary font-bold text-primary-foreground enabled:hover:bg-primary'
                    )}
                    onClick={() => {
                      if (!d || !hasTicket) return;
                      setSelectedDay(d);
                      setSelectedTime(null);
                      clearFieldError('date');
                    }}
                  >
                    {d ?? ''}
                  </button>
                );
              })}
            </div>
          </div>
          <FieldError>{fieldErrors.date}</FieldError>
        </div>

        <div>
          <p className="m-0 mb-1.5 text-sm font-medium">
            방문 희망 시간<span className="ml-0.5 text-destructive">*</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {CONSULTATION_TIME_SLOTS.map((t) => {
              const remaining = slotRemaining(t);
              const full = remaining <= 0;
              return (
                <Button
                  key={t}
                  type="button"
                  variant={t === selectedTime ? 'default' : 'outline'}
                  className="h-auto flex-col gap-0 py-2"
                  disabled={full}
                  onClick={() => {
                    setSelectedTime(t);
                    clearFieldError('time');
                  }}
                >
                  <span className="font-semibold">{t}</span>
                  {full && <small className="text-[11px] font-normal">마감</small>}
                  {!full && Number.isFinite(remaining) && <small className="text-[11px] font-normal">잔여 {remaining}</small>}
                </Button>
              );
            })}
          </div>
          <FieldError>{fieldErrors.time}</FieldError>
        </div>

        <TextareaField control={form.control} name="message" label="기타 요청사항" rows={3} placeholder="자유롭게 작성해주세요. (선택)" />

        <div>
          <CheckboxField
            control={form.control}
            name="leadConsent"
            label="현장 방문 시 참가업체가 제 QR을 스캔해 연락처를 확인하는 데 동의합니다. (필수)"
          />
          <FieldError>{fieldErrors.leadConsent}</FieldError>
        </div>

        <FieldError>{error}</FieldError>

        <div className="flex gap-2">
          <Button type="button" variant="outline" size="lg" onClick={() => setMode('view')}>
            취소
          </Button>
          <Button type="submit" size="lg" className="flex-1" disabled={submitting || !leadConsent}>
            {submitting ? '저장 중...' : '저장'}
          </Button>
        </div>
      </form>
    </Form>
  );

  return (
    <AppDialog
      onClose={onClose}
      size="md"
      title={consultation.expoTitle}
      description={`${consultation.boothNo} 부스`}
    >
      <div>
        <Badge variant="secondary" className={STATUS_BADGE[consultation.status]}>
          {STATUS_LABEL[consultation.status] ?? consultation.status}
        </Badge>
      </div>
      {mode === 'view' ? viewBody : editBody}
    </AppDialog>
  );
}

export default ConsultationDetailModal;
