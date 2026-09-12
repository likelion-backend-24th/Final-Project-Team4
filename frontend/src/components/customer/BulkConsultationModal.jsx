import { useEffect, useMemo, useState } from 'react';
import ConsultationCompleteModal from './ConsultationCompleteModal';
import { CONSULTATION_TIME_SLOTS } from '../../mock/customerData';
import { applyConsultation, getMyConsultations, toAssetUrl } from '../../api/expo';
import { getMyReservations } from '../../api/reservation';
import { buildCalendar, toIsoDate, WEEKDAYS } from '../../utils/calendar';
import './Modal.css';
import '../../pages/customer/VehicleDetail.css';
import '../../pages/customer/ExhibitorVehicleList.css';
import '../../pages/customer/ExhibitorList.css';
import './BulkConsultationModal.css';

const ACTIVE_STATUSES = new Set(['REQUESTED', 'APPROVED']);

// 참가업체 목록에서 여러 곳을 골라 상담 신청 정보를 한 번만 입력해 동시에 신청하는 2단계 모달.
// 1단계: 참가업체 선택 + 개인정보 + 방문 희망 날짜/시간(보유한 입장권 날짜만, 이미 신청한 날짜는 제외)
// 2단계: 상담 유형 + 관심 차종 + 운전면허 소지 여부 + 기타 요청사항
function BulkConsultationModal({ expoId, groups, onClose }) {
  const today = useMemo(() => new Date(), []);

  const [step, setStep] = useState(1);
  const [selectedBoothIds, setSelectedBoothIds] = useState(new Set());
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [ticketDates, setTicketDates] = useState(new Set());
  const [myConsultations, setMyConsultations] = useState([]);
  const [previewGroup, setPreviewGroup] = useState(null);

  const [wantsPurchase, setWantsPurchase] = useState(false);
  const [wantsTestDrive, setWantsTestDrive] = useState(false);
  const [interestedVehicle, setInterestedVehicle] = useState('');
  const [hasDriverLicense, setHasDriverLicense] = useState(false);
  const [message, setMessage] = useState('');

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

  const toggleBooth = (boothId) =>
    setSelectedBoothIds((prev) => {
      const next = new Set(prev);
      if (next.has(boothId)) next.delete(boothId);
      else next.add(boothId);
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
    if (!hasTicket) {
      setFieldErrors((prev) => ({ ...prev, date: '입장권이 있는 날짜만 선택 가능합니다.' }));
      return;
    }
    setSelectedDay(d);
    setSelectedTime(null);
    clearFieldError('date');
  };

  const validateStep1 = () => {
    const errors = {};
    if (selectedBoothIds.size === 0) errors.booths = '상담을 신청할 참가업체를 하나 이상 선택해주세요.';
    if (!form.name.trim()) errors.name = '이름을 입력해주세요.';
    if (!form.phone.trim()) errors.phone = '전화번호를 입력해주세요.';
    if (!form.email.trim()) errors.email = '이메일을 입력해주세요.';
    if (!selectedDay) errors.date = '방문 희망 날짜를 선택해주세요.';
    else if (!selectedTime) errors.time = '방문 희망 시간을 선택해주세요.';
    return errors;
  };

  const handleNext = () => {
    const errors = validateStep1();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setStep(2);
  };

  const preferredDate = () => toIsoDate(viewYear, viewMonth, selectedDay);

  const handleSubmit = () => {
    if (submitting) return;
    if (!wantsPurchase && !wantsTestDrive) {
      setFieldErrors({ consultType: '상담 유형을 하나 이상 선택해주세요.' });
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    setSubmitError(null);

    applyConsultation({
      boothIds: [...selectedBoothIds],
      customerName: form.name,
      customerPhone: form.phone,
      customerEmail: form.email,
      wantsPurchase,
      wantsTestDrive,
      interestedVehicle: interestedVehicle.trim() || null,
      hasDriverLicense,
      preferredDate: preferredDate(),
      preferredTime: selectedTime,
      message: message.trim() || null,
    })
      .then(() => {
        const dateLabel = `${viewYear}년 ${viewMonth + 1}월 ${selectedDay}일(${WEEKDAYS[new Date(viewYear, viewMonth, selectedDay).getDay()]})`;
        const exhibitorNames = groups
          .filter((g) => selectedBoothIds.has(g.boothId))
          .map((g) => g.title)
          .join(', ');
        setComplete({
          exhibitorNames,
          schedule: `${dateLabel} ${selectedTime}`,
          phone: form.phone,
          email: form.email,
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

  return (
    <div className="c-modal__backdrop" onClick={onClose}>
      <div className="c-bulk-consult__wrapper" onClick={(e) => e.stopPropagation()}>
        {previewGroup && (
          <div className="c-bulk-consult__preview">
            <div className="c-bulk-consult__preview-head">
              <h3>{previewGroup.title} 전시 차량</h3>
              <button type="button" className="c-modal__close" onClick={() => setPreviewGroup(null)} aria-label="닫기">
                ✕
              </button>
            </div>
            {previewGroup.vehicles.length === 0 ? (
              <p className="c-bulk-consult__hint">등록된 전시 차량이 없습니다.</p>
            ) : (
              <div className="c-bulk-consult__preview-list">
                {previewGroup.vehicles.map((v) => (
                  <div key={v.vehicleId} className="c-bulk-consult__preview-vehicle">
                    <div className="c-vehicle-card__thumb">
                      {v.images[0] && <img src={toAssetUrl(v.images[0].imageUrl)} alt={v.name} />}
                    </div>
                    <div>
                      <strong>{v.name}</strong>
                      <div className="c-vehicle-card__tags">
                        {v.tags.map((t) => (
                          <span key={t} className="c-vehicle-card__tag">{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="c-bulk-consult">
          <button type="button" className="c-modal__close" onClick={onClose} aria-label="닫기">
            ✕
          </button>

          <div className="c-bulk-consult__steps">
            <span className={step === 1 ? 'is-active' : ''}>1. 업체 선택 · 방문 정보</span>
            <span className={step === 2 ? 'is-active' : ''}>2. 상담 내용</span>
          </div>

          {step === 1 ? (
            <div className="c-bulk-consult__body">
              <div className="c-bulk-consult__col">
                <h3>참가업체 선택</h3>
                <p className="c-bulk-consult__hint">상담받고 싶은 참가업체를 모두 선택하세요.</p>
                {fieldErrors.booths && <span className="c-consult__error">{fieldErrors.booths}</span>}
                <div className="c-bulk-consult__exhibitor-list">
                  {groups.map((g) => (
                    <div key={g.boothId} className="c-bulk-consult__exhibitor">
                      <label>
                        <input
                          type="checkbox"
                          checked={selectedBoothIds.has(g.boothId)}
                          onChange={() => {
                            toggleBooth(g.boothId);
                            clearFieldError('booths');
                          }}
                        />
                        <span className="c-exhibitor-card__logo">{g.title.slice(0, 1)}</span>
                        <span className="c-bulk-consult__exhibitor-name">{g.title}</span>
                        <span className="c-vehicle-group__booth">{g.boothNo}</span>
                      </label>
                      <button
                        type="button"
                        className="c-bulk-consult__preview-btn"
                        onClick={() => setPreviewGroup(g)}
                      >
                        전시 차량 보기
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="c-bulk-consult__col">
                <h3>신청 정보</h3>
                <label className="c-consult__field">
                  <span>이름 <span className="c-consult__required">*</span></span>
                  <input
                    className={fieldErrors.name ? 'c-consult__input--invalid' : ''}
                    placeholder="이름을 입력하세요."
                    value={form.name}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, name: e.target.value }));
                      clearFieldError('name');
                    }}
                  />
                  {fieldErrors.name && <span className="c-consult__error">{fieldErrors.name}</span>}
                </label>
                <label className="c-consult__field">
                  <span>전화번호 <span className="c-consult__required">*</span></span>
                  <input
                    className={fieldErrors.phone ? 'c-consult__input--invalid' : ''}
                    placeholder="010-1234-5678"
                    value={form.phone}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, phone: e.target.value }));
                      clearFieldError('phone');
                    }}
                  />
                  {fieldErrors.phone && <span className="c-consult__error">{fieldErrors.phone}</span>}
                </label>
                <label className="c-consult__field">
                  <span>이메일 <span className="c-consult__required">*</span></span>
                  <input
                    type="email"
                    className={fieldErrors.email ? 'c-consult__input--invalid' : ''}
                    placeholder="example@domain.com"
                    value={form.email}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, email: e.target.value }));
                      clearFieldError('email');
                    }}
                  />
                  {fieldErrors.email && <span className="c-consult__error">{fieldErrors.email}</span>}
                </label>

                <div className="c-consult__field">
                  <span>방문 희망 날짜 <span className="c-consult__required">*</span></span>
                  <div className="c-consult__calendar-legend">
                    <span><span className="c-consult__legend-dot" /> 보유한 입장권 날짜</span>
                    <span><span className="c-consult__legend-dot c-consult__legend-dot--applied" /> 이미 상담 신청한 날짜(선택 불가)</span>
                  </div>
                  <div className="c-consult__calendar">
                    <div className="c-consult__calendar-head">
                      <button type="button" onClick={goToPrevMonth} aria-label="이전 달">&lt;</button>
                      <strong>{viewYear}년 {viewMonth + 1}월</strong>
                      <button type="button" onClick={goToNextMonth} aria-label="다음 달">&gt;</button>
                    </div>
                    <div className="c-consult__calendar-weekdays">
                      {WEEKDAYS.map((w) => (
                        <span key={w}>{w}</span>
                      ))}
                    </div>
                    <div className="c-consult__calendar-grid">
                      {calendarCells.map((d, i) => {
                        const iso = d ? toIsoDate(viewYear, viewMonth, d) : null;
                        const hasTicket = d && ticketDates.has(iso);
                        const isApplied = d && appliedDates.has(iso);
                        return (
                          <button
                            key={i}
                            type="button"
                            disabled={!d || isApplied}
                            className={[
                              d && d === selectedDay && 'is-selected',
                              hasTicket && !isApplied && 'has-ticket',
                              isApplied && 'is-applied',
                            ].filter(Boolean).join(' ')}
                            onClick={() => d && selectDay(d, hasTicket)}
                          >
                            {d ?? ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {fieldErrors.date && <span className="c-consult__error">{fieldErrors.date}</span>}
                </div>

                <div className="c-consult__field">
                  <span>방문 희망 시간 <span className="c-consult__required">*</span></span>
                  <div className="c-consult__slots">
                    {CONSULTATION_TIME_SLOTS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        disabled={isSlotBlocked(t)}
                        className={t === selectedTime ? 'is-selected' : ''}
                        onClick={() => {
                          setSelectedTime(t);
                          clearFieldError('time');
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  {isSelectedDayToday && (
                    <p className="c-bulk-consult__hint">오늘 방문은 지금으로부터 20분 이후 시간만 선택할 수 있어요.</p>
                  )}
                  {fieldErrors.time && <span className="c-consult__error">{fieldErrors.time}</span>}
                </div>
              </div>
            </div>
          ) : (
            <div className="c-bulk-consult__body c-bulk-consult__body--single">
              <div className="c-bulk-consult__col">
                <div className="c-consult__field">
                  <span>상담 유형 <span className="c-consult__required">*</span> (최소 1개 선택)</span>
                  <div className="c-consult__slots">
                    <button
                      type="button"
                      className={wantsPurchase ? 'is-selected' : ''}
                      onClick={() => {
                        setWantsPurchase((v) => !v);
                        clearFieldError('consultType');
                      }}
                    >
                      구매 상담
                    </button>
                    <button
                      type="button"
                      className={wantsTestDrive ? 'is-selected' : ''}
                      onClick={() => {
                        setWantsTestDrive((v) => !v);
                        clearFieldError('consultType');
                      }}
                    >
                      시승 상담
                    </button>
                  </div>
                  {fieldErrors.consultType && <span className="c-consult__error">{fieldErrors.consultType}</span>}
                </div>

                <label className="c-consult__field">
                  <span>관심 차종</span>
                  <input
                    placeholder="예: EV6, 아이오닉5 (선택)"
                    value={interestedVehicle}
                    onChange={(e) => setInterestedVehicle(e.target.value)}
                  />
                </label>

                {wantsTestDrive && (
                  <label className="c-bulk-consult__checkbox-row">
                    <input
                      type="checkbox"
                      checked={hasDriverLicense}
                      onChange={(e) => setHasDriverLicense(e.target.checked)}
                    />
                    <span>시승을 위한 운전면허를 소지하고 있습니다.</span>
                  </label>
                )}

                <label className="c-consult__field">
                  <span>기타 요청사항</span>
                  <textarea
                    className="c-bulk-consult__textarea"
                    placeholder="원하는 차종 컬러, 연식, 인승 등 자유롭게 작성해주세요. (선택)"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                  />
                </label>

                {submitError && <p className="c-consult__error">{submitError}</p>}
              </div>
            </div>
          )}

          <div className="c-bulk-consult__actions">
            {step === 1 ? (
              <button type="button" className="c-consult__submit" onClick={handleNext}>
                다음
              </button>
            ) : (
              <>
                <button type="button" className="c-bulk-consult__back" onClick={() => setStep(1)}>
                  이전
                </button>
                <button type="button" className="c-consult__submit" disabled={submitting} onClick={handleSubmit}>
                  {submitting ? '신청 중...' : '상담 신청하기'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BulkConsultationModal;
