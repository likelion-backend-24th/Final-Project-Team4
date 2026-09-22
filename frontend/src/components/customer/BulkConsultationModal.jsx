import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import ConsultationCompleteModal from './ConsultationCompleteModal';
import ConsultationLoadingOverlay from './ConsultationLoadingOverlay';
import { CONSULTATION_TIME_SLOTS } from '../../mock/customerData';
import { applyConsultation, getConsultationSlotAvailability, getMyConsultations, toAssetUrl } from '../../api/expo';
import { getMyProfile } from '../../api/identity';
import { getMyReservations } from '../../api/reservation';
import { buildCalendar, toIsoDate, WEEKDAYS } from '../../utils/calendar';
import { boothNoLabel, mergeExhibitorGroups } from '../../utils/exhibitorGroups';
import { formatPhoneNumber } from '../../utils/phone';
import { CheckboxField, TextareaField, TextField } from '../form/fields';
import { AppDialog } from '@/components/layout/AppDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const ACTIVE_STATUSES = new Set(['REQUESTED', 'APPROVED']);
const PREVIEW_PER_PAGE = 5;

const formSchema = z.object({
  name: z.string().trim().min(1, '이름을 입력해주세요.'),
  phone: z.string().trim().min(1, '전화번호를 입력해주세요.'),
  email: z.string().trim().min(1, '이메일을 입력해주세요.').email('올바른 이메일 형식이 아닙니다.'),
  wantsPurchase: z.boolean(),
  wantsTestDrive: z.boolean(),
  interestedVehicle: z.string(),
  hasDriverLicense: z.boolean(),
  message: z.string(),
  leadConsent: z.boolean(),
});

function FieldError({ children }) {
  return children ? <p className="m-0 mt-1 text-sm text-destructive">{children}</p> : null;
}

function SectionLabel({ children, required }) {
  return (
    <p className="m-0 mb-1.5 text-sm font-medium">
      {children}
      {required && <span className="ml-0.5 text-destructive">*</span>}
    </p>
  );
}

// 참가업체 목록에서 여러 곳을 골라 상담 신청 정보를 한 번만 입력해 동시에 신청하는 2단계 모달.
// 1단계: 참가업체 선택 + 개인정보 + 방문 희망 날짜/시간(보유한 입장권 날짜만, 이미 신청한 날짜는 제외)
// 2단계: 상담 유형 + 관심 차종 + 운전면허 소지 여부 + 기타 요청사항
// lockedBoothId: 특정 참가업체 페이지에서 열었을 때 그 업체로 고정한다(업체 선택 목록 없이 읽기 전용 표시).
// defaultVehicle: 차량 상세에서 열었을 때 관심 차종 입력란에 미리 채워둘 차량명.
function BulkConsultationModal({ expoId, groups, lockedBoothId, defaultVehicle, onClose }) {
  const today = useMemo(() => new Date(), []);
  // 같은 신청(applicationGroupId)으로 접수한 부스는 참가업체 하나로 묶어서 선택/상담 신청한다.
  const exhibitorGroups = useMemo(() => mergeExhibitorGroups(groups), [groups]);
  const lockedGroup =
    lockedBoothId != null
      ? exhibitorGroups.find((g) => g.boothIds.some((id) => String(id) === String(lockedBoothId)))
      : null;

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      wantsPurchase: false,
      wantsTestDrive: false,
      interestedVehicle: defaultVehicle ?? '',
      hasDriverLicense: false,
      message: '',
      leadConsent: false,
    },
  });
  const wantsTestDrive = form.watch('wantsTestDrive');
  const leadConsent = form.watch('leadConsent');

  const [step, setStep] = useState(1);
  // 업체당 상담 신청은 1건만 만들어야 해서(부스마다 신청하면 상담 신청 관리 화면에 같은 요청이 부스 수만큼 중복돼 보임),
  // 대표 부스(g.boothId, 부스번호가 가장 낮은 곳) 하나만 선택 상태로 담는다. QR 리드확보도 같은 대표 부스로 스캔하도록
  // 맞춰놔서(LeadCapture.jsx) 어느 부스로 스캔해도가 아니라 항상 이 대표 부스로만 스캔하면 매칭된다.
  const [selectedBoothIds, setSelectedBoothIds] = useState(
    () => new Set(lockedGroup ? [lockedGroup.boothId] : [])
  );
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [ticketDates, setTicketDates] = useState(new Set());
  const [myConsultations, setMyConsultations] = useState([]);
  const [previewGroup, setPreviewGroup] = useState(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [slotAvailability, setSlotAvailability] = useState([]); // 선택한 업체별 그 날짜의 시간대 정원/신청 건수

  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [complete, setComplete] = useState(null);

  const calendarCells = useMemo(() => buildCalendar(viewYear, viewMonth), [viewYear, viewMonth]);

  useEffect(() => {
    getMyReservations()
      .then((tickets) => {
        const dates = tickets.filter((t) => String(t.expoId) === expoId).map((t) => t.visitDate);
        setTicketDates(new Set(dates));
      })
      .catch(() => setTicketDates(new Set()));
    getMyConsultations()
      .then(setMyConsultations)
      .catch(() => setMyConsultations([]));
  }, [expoId]);

  // 이미 등록된 내 정보(이름/전화번호/이메일)가 있으면 자동으로 채워준다 - 매번 다시 타이핑하지 않도록.
  useEffect(() => {
    getMyProfile()
      .then((profile) => {
        const cur = form.getValues();
        form.reset({
          ...cur,
          name: cur.name || profile.name || '',
          phone: cur.phone || (profile.contact ? formatPhoneNumber(profile.contact) : ''),
          email: cur.email || profile.email || '',
        });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 현재 선택된 참가업체들 중 하나라도 이미 신청(대기/승인)이 있는 날짜 - 같은 날짜로 재신청하면 어차피 409.
  const appliedDates = useMemo(() => {
    const set = new Set();
    myConsultations.forEach((c) => {
      if (selectedBoothIds.has(c.boothId) && ACTIVE_STATUSES.has(c.status)) {
        set.add(c.preferredDate);
      }
    });
    return set;
  }, [myConsultations, selectedBoothIds]);

  // 날짜를 먼저 고른 뒤 업체를 추가/변경해서 그 날짜가 이미 신청된 날짜가 되면 선택을 풀어준다.
  useEffect(() => {
    if (selectedDay && appliedDates.has(toIsoDate(viewYear, viewMonth, selectedDay))) {
      setSelectedDay(null);
      setSelectedTime(null);
      setFieldErrors((prev) => ({ ...prev, date: '선택한 업체에 이미 상담 신청한 날짜입니다. 다른 날짜를 선택해주세요.' }));
    }
  }, [appliedDates, selectedDay, viewYear, viewMonth]);

  // 날짜와 업체가 정해지면 업체별 시간대 잔여를 조회한다 - 한 업체라도 정원이 찬 시간대는 신청할 수 없다(서버도 같은 기준으로 막는다).
  useEffect(() => {
    if (!selectedDay || selectedBoothIds.size === 0) {
      setSlotAvailability([]);
      return undefined;
    }
    let cancelled = false;
    const date = toIsoDate(viewYear, viewMonth, selectedDay);
    Promise.all([...selectedBoothIds].map((boothId) => getConsultationSlotAvailability(boothId, date)))
      .then((list) => {
        if (!cancelled) setSlotAvailability(list);
      })
      .catch(() => {
        if (!cancelled) setSlotAvailability([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedBoothIds, selectedDay, viewYear, viewMonth]);

  // 선택한 업체들 중 가장 적게 남은 자리 수(정보가 없으면 제한 없음).
  const slotRemaining = (slot) =>
    slotAvailability.reduce((min, a) => {
      const found = a.slots.find((x) => x.time.slice(0, 5) === slot);
      return Math.min(min, (found?.capacity ?? a.defaultCapacity) - (found?.booked ?? 0));
    }, Infinity);

  useEffect(() => {
    if (selectedTime && slotRemaining(selectedTime) <= 0) setSelectedTime(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotAvailability]);

  const todayIso = toIsoDate(today.getFullYear(), today.getMonth(), today.getDate());
  // 업체와 날짜를 정해야 시간대별 잔여를 알 수 있어서, 그 전엔 시간 선택을 막고 안내한다.
  const slotsReady = selectedDay != null && selectedBoothIds.size > 0;

  const isSelectedDayToday =
    selectedDay === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

  // 오늘 날짜를 골랐을 때 이미 지났거나 20분 이내로 임박한 시간대는 막는다.
  const isSlotBlocked = (slot) => {
    if (!isSelectedDayToday) return false;
    const [h, m] = slot.split(':').map(Number);
    const slotTime = new Date(viewYear, viewMonth, selectedDay, h, m);
    return slotTime.getTime() < Date.now() + 20 * 60 * 1000;
  };

  const clearFieldError = (field) =>
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  // 참가업체 단위 토글 - 부스를 여러 개 가진 업체도 대표 부스 하나만 선택/해제한다(상담 신청은 업체당 1건).
  const toggleExhibitorGroup = (group) =>
    setSelectedBoothIds((prev) => {
      const next = new Set(prev);
      if (next.has(group.boothId)) next.delete(group.boothId);
      else next.add(group.boothId);
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

  const selectDay = (d, hasTicket) => {
    if (toIsoDate(viewYear, viewMonth, d) < todayIso) {
      setFieldErrors((prev) => ({ ...prev, date: '이미 지난 날짜는 선택할 수 없습니다.' }));
      return;
    }
    if (!hasTicket) {
      setFieldErrors((prev) => ({ ...prev, date: '입장권이 있는 날짜만 선택 가능합니다.' }));
      return;
    }
    setSelectedDay(d);
    setSelectedTime(null);
    clearFieldError('date');
  };

  // 업체/날짜/시간 검증은 폼 밖 상태라 직접 하고, 이름/전화/이메일은 폼(zod)이 검증한다.
  const validateSchedule = () => {
    const errors = {};
    if (selectedBoothIds.size === 0) errors.booths = '상담을 신청할 참가업체를 하나 이상 선택해주세요.';
    if (!selectedDay) errors.date = '방문 희망 날짜를 선택해주세요.';
    else if (!selectedTime) errors.time = '방문 희망 시간을 선택해주세요.';
    return errors;
  };

  const handleNext = async () => {
    const errors = validateSchedule();
    const infoOk = await form.trigger(['name', 'phone', 'email']);
    if (Object.keys(errors).length > 0 || !infoOk) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setStep(2);
  };

  const preferredDate = () => toIsoDate(viewYear, viewMonth, selectedDay);

  const handleSubmit = (values) => {
    if (submitting) return;
    if (!values.wantsPurchase && !values.wantsTestDrive) {
      setFieldErrors({ consultType: '상담 유형을 하나 이상 선택해주세요.' });
      return;
    }
    if (!values.leadConsent) {
      setFieldErrors({ leadConsent: '연락처 제공 동의는 필수입니다.' });
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    setSubmitError(null);

    applyConsultation({
      boothIds: [...selectedBoothIds],
      customerName: values.name,
      customerPhone: values.phone,
      customerEmail: values.email,
      wantsPurchase: values.wantsPurchase,
      wantsTestDrive: values.wantsTestDrive,
      interestedVehicle: values.interestedVehicle.trim() || null,
      hasDriverLicense: values.hasDriverLicense,
      preferredDate: preferredDate(),
      preferredTime: selectedTime,
      message: values.message.trim() || null,
      leadConsent: values.leadConsent,
    })
      .then(() => {
        const dateLabel = `${viewYear}년 ${viewMonth + 1}월 ${selectedDay}일(${WEEKDAYS[new Date(viewYear, viewMonth, selectedDay).getDay()]})`;
        const exhibitorNames = exhibitorGroups
          .filter((g) => g.boothIds.some((id) => selectedBoothIds.has(id)))
          .map((g) => g.title)
          .join(', ');
        setComplete({
          exhibitorNames,
          schedule: `${dateLabel} ${selectedTime}`,
          phone: values.phone,
          email: values.email,
        });
      })
      .catch((err) => setSubmitError(err.response?.data?.error?.message ?? '상담 신청에 실패했습니다.'))
      .finally(() => setSubmitting(false));
  };

  if (complete) {
    return (
      <ConsultationCompleteModal
        summary={complete}
        onClose={() => {
          setComplete(null);
          onClose();
        }}
      />
    );
  }

  if (submitting) {
    return <ConsultationLoadingOverlay />;
  }

  const previewVehicles = previewGroup
    ? previewGroup.vehicles.slice((previewPage - 1) * PREVIEW_PER_PAGE, previewPage * PREVIEW_PER_PAGE)
    : [];

  const scheduleColumn = (
    <div className="flex flex-col gap-4">
      <h3 className="m-0 text-base font-semibold">신청 정보</h3>
      <TextField control={form.control} name="name" label="이름" required placeholder="이름을 입력하세요." />
      <TextField
        control={form.control}
        name="phone"
        label="전화번호"
        required
        placeholder="010-1234-5678"
        transform={formatPhoneNumber}
      />
      <TextField control={form.control} name="email" label="이메일" required type="email" placeholder="example@domain.com" />
      {lockedGroup && (
        <div className="grid gap-1.5">
          <Label>참가업체</Label>
          <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">
            {lockedGroup.title} ({boothNoLabel(lockedGroup.boothNos)})
          </div>
        </div>
      )}

      <div>
        <SectionLabel required>방문 희망 날짜</SectionLabel>
        <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded bg-blue-100" /> 보유한 입장권 날짜
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded bg-slate-200" /> 이미 상담 신청한 날짜(선택 불가)
          </span>
        </div>
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
              const isPast = d && iso < todayIso;
              const hasTicket = d && ticketDates.has(iso);
              const isApplied = d && appliedDates.has(iso);
              const selected = d && d === selectedDay;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!d || isApplied || isPast}
                  onClick={() => d && selectDay(d, hasTicket)}
                  className={cn(
                    'aspect-square rounded-md border-0 bg-transparent text-[13px] transition-colors enabled:cursor-pointer enabled:hover:bg-muted',
                    hasTicket && !isApplied && !isPast && 'bg-blue-100 font-semibold text-blue-700 enabled:hover:bg-blue-200',
                    isApplied && 'bg-slate-200 font-semibold text-slate-400',
                    isPast && 'text-slate-300 line-through',
                    selected && 'bg-primary font-bold text-primary-foreground enabled:hover:bg-primary'
                  )}
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
        <SectionLabel required>방문 희망 시간</SectionLabel>
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
                disabled={!slotsReady || isSlotBlocked(t) || full}
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
        {!slotsReady && (
          <p className="m-0 mt-2 text-xs text-muted-foreground">
            참가업체와 방문 날짜를 선택하면 시간대별 잔여 자리가 표시됩니다.
          </p>
        )}
        {isSelectedDayToday && (
          <p className="m-0 mt-2 text-xs text-muted-foreground">오늘 방문은 지금으로부터 20분 이후 시간만 선택할 수 있어요.</p>
        )}
        <FieldError>{fieldErrors.time}</FieldError>
      </div>
    </div>
  );

  const exhibitorColumn = !lockedGroup && (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="m-0 text-base font-semibold">참가업체 선택</h3>
        <p className="m-0 mt-1 text-xs text-muted-foreground">상담받고 싶은 참가업체를 모두 선택하세요.</p>
      </div>
      <FieldError>{fieldErrors.booths}</FieldError>
      <div className="flex max-h-[28rem] flex-col gap-2 overflow-y-auto pr-1">
        {exhibitorGroups.map((g) => (
          <div key={g.key} className="flex items-center justify-between gap-2 rounded-lg border p-3">
            <Label className="min-w-0 flex-1 cursor-pointer">
              <Checkbox
                checked={selectedBoothIds.has(g.boothId)}
                onCheckedChange={() => {
                  toggleExhibitorGroup(g);
                  clearFieldError('booths');
                }}
              />
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                {g.title.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1 truncate">{g.title}</span>
              <Badge variant="secondary">{boothNoLabel(g.boothNos)}</Badge>
            </Label>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => {
                setPreviewGroup(g);
                setPreviewPage(1);
              }}
            >
              전시 차량 보기
            </Button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <AppDialog onClose={onClose} size={lockedGroup ? 'md' : 'xl'} title="상담 신청">
        <div className="flex gap-4 border-b pb-2 text-sm font-semibold">
          <span className={cn(step === 1 ? 'text-primary' : 'text-muted-foreground')}>
            {lockedGroup ? '1. 방문 정보' : '1. 업체 선택 · 방문 정보'}
          </span>
          <span className={cn(step === 2 ? 'text-primary' : 'text-muted-foreground')}>2. 상담 내용</span>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} noValidate className="flex flex-col gap-5">
            {step === 1 ? (
              <div className={cn('grid gap-8', !lockedGroup && 'md:grid-cols-2')}>
                {exhibitorColumn}
                {scheduleColumn}
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div>
                  <SectionLabel required>상담 유형 (최소 1개 선택)</SectionLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: 'wantsPurchase', label: '구매 상담' },
                      { name: 'wantsTestDrive', label: '시승 상담' },
                    ].map(({ name, label }) => {
                      const on = form.watch(name);
                      return (
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
                      );
                    })}
                  </div>
                  <FieldError>{fieldErrors.consultType}</FieldError>
                </div>

                <TextField
                  control={form.control}
                  name="interestedVehicle"
                  label="관심 차종"
                  placeholder="예: EV6, 아이오닉5 (선택)"
                />

                {wantsTestDrive && (
                  <CheckboxField
                    control={form.control}
                    name="hasDriverLicense"
                    label="시승을 위한 운전면허를 소지하고 있습니다."
                  />
                )}

                <TextareaField
                  control={form.control}
                  name="message"
                  label="기타 요청사항"
                  rows={4}
                  placeholder="원하는 차종 컬러, 연식, 인승 등 자유롭게 작성해주세요. (선택)"
                />

                <div>
                  <CheckboxField
                    control={form.control}
                    name="leadConsent"
                    label="현장 방문 시 참가업체가 제 QR을 스캔해 연락처를 확인하는 데 동의합니다. (필수)"
                  />
                  <FieldError>{fieldErrors.leadConsent}</FieldError>
                </div>

                <FieldError>{submitError}</FieldError>
              </div>
            )}

            <div className="flex gap-2">
              {step === 1 ? (
                <Button type="button" size="lg" className="h-11 w-full" onClick={handleNext}>
                  다음
                </Button>
              ) : (
                <>
                  <Button type="button" variant="outline" size="lg" className="h-11" onClick={() => setStep(1)}>
                    이전
                  </Button>
                  <Button type="submit" size="lg" className="h-11 flex-1" disabled={submitting || !leadConsent}>
                    {submitting ? '신청 중...' : '상담 신청하기'}
                  </Button>
                </>
              )}
            </div>
          </form>
        </Form>
      </AppDialog>

      {previewGroup && (
        <AppDialog onClose={() => setPreviewGroup(null)} title={`${previewGroup.title} 전시 차량`} size="sm">
          {previewGroup.vehicles.length === 0 ? (
            <p className="m-0 text-sm text-muted-foreground">등록된 전시 차량이 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {previewVehicles.map((v) => (
                <div key={v.vehicleId} className="flex items-center gap-3">
                  <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                    {v.images[0] && <img src={toAssetUrl(v.images[0].imageUrl)} alt={v.name} className="size-full object-cover" />}
                  </div>
                  <div className="min-w-0">
                    <strong className="block text-sm">{v.name}</strong>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {v.tags.map((t) => (
                        <Badge key={t} variant="secondary" className="font-normal">{t}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {previewGroup.vehicles.length > PREVIEW_PER_PAGE && (
            <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
              <Button type="button" variant="outline" size="icon-sm" onClick={() => setPreviewPage(previewPage - 1)} disabled={previewPage === 1}>
                <ChevronLeft />
              </Button>
              <span>
                {previewPage} / {Math.ceil(previewGroup.vehicles.length / PREVIEW_PER_PAGE)}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => setPreviewPage(previewPage + 1)}
                disabled={previewPage * PREVIEW_PER_PAGE >= previewGroup.vehicles.length}
              >
                <ChevronRight />
              </Button>
            </div>
          )}
        </AppDialog>
      )}
    </>
  );
}

export default BulkConsultationModal;
