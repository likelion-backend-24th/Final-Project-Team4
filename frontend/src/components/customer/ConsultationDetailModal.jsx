import { useEffect, useMemo, useState } from 'react';
import ConsultationLoadingOverlay from './ConsultationLoadingOverlay';
import { CONSULTATION_TIME_SLOTS } from '../../mock/customerData';
import { cancelConsultation, updateConsultation } from '../../api/expo';
import { getMyReservations } from '../../api/reservation';
import { buildCalendar, toIsoDate, WEEKDAYS } from '../../utils/calendar';
import './Modal.css';
import '../../pages/customer/VehicleDetail.css';
import './ConsultationDetailModal.css';

const STATUS_LABEL = {
  REQUESTED: '대기',
  APPROVED: '승인',
  REJECTED: '반려',
  CANCELED: '취소함',
  COMPLETED: '상담 완료',
  NO_SHOW: '미방문 처리됨',
};

// 고객 마이페이지 - 신청한 상담 1건 상세 조회 + (대기 중일 때만) 수정/취소.
function ConsultationDetailModal({ consultation, onClose, onChanged }) {
  const [mode, setMode] = useState('view'); // 'view' | 'edit'
  const editable = consultation.status === 'REQUESTED';

  const initialDate = new Date(`${consultation.preferredDate}T00:00:00`);
  const [wantsPurchase, setWantsPurchase] = useState(consultation.wantsPurchase);
  const [wantsTestDrive, setWantsTestDrive] = useState(consultation.wantsTestDrive);
  const [interestedVehicle, setInterestedVehicle] = useState(consultation.interestedVehicle ?? '');
  const [hasDriverLicense, setHasDriverLicense] = useState(consultation.hasDriverLicense);
  const [message, setMessage] = useState(consultation.message ?? '');
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const [selectedDay, setSelectedDay] = useState(initialDate.getDate());
  const [selectedTime, setSelectedTime] = useState(consultation.preferredTime?.slice(0, 5) ?? null);
  const [ticketDates, setTicketDates] = useState(new Set());

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

  const handleSave = () => {
    const errors = {};
    if (!wantsPurchase && !wantsTestDrive) errors.consultType = '상담 유형을 하나 이상 선택해주세요.';
    if (!selectedDay) errors.date = '방문 희망 날짜를 선택해주세요.';
    else if (!selectedTime) errors.time = '방문 희망 시간을 선택해주세요.';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    setError(null);
    updateConsultation(consultation.consultationId, {
      wantsPurchase,
      wantsTestDrive,
      interestedVehicle: interestedVehicle.trim() || null,
      hasDriverLicense,
      preferredDate: toIsoDate(viewYear, viewMonth, selectedDay),
      preferredTime: `${selectedTime}:00`,
      message: message.trim() || null,
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

  return (
    <div className="c-modal__backdrop" onClick={onClose}>
      <div className="c-consult-detail" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="c-modal__close" onClick={onClose} aria-label="닫기">
          ✕
        </button>

        <span className={`c-consult-detail__status c-consult-detail__status--${consultation.status.toLowerCase()}`}>
          {STATUS_LABEL[consultation.status] ?? consultation.status}
        </span>
        <h2>{consultation.expoTitle}</h2>
        <p className="c-consult-detail__sub">{consultation.boothNo} 부스</p>

        {mode === 'view' ? (
          <>
            <dl className="c-modal__info">
              <div className="c-modal__info-row"><dt>관심 차종</dt><dd>{consultation.interestedVehicle || '-'}</dd></div>
              <div className="c-modal__info-row">
                <dt>상담 유형</dt>
                <dd>{[consultation.wantsPurchase && '구매', consultation.wantsTestDrive && '시승'].filter(Boolean).join(' + ')}</dd>
              </div>
              {consultation.wantsTestDrive && (
                <div className="c-modal__info-row"><dt>운전면허 소지</dt><dd>{consultation.hasDriverLicense ? '소지' : '미소지'}</dd></div>
              )}
              <div className="c-modal__info-row">
                <dt>희망 방문일</dt>
                <dd>{consultation.preferredDate} {consultation.preferredTime?.slice(0, 5)}</dd>
              </div>
            </dl>

            {consultation.message && (
              <div className="c-consult-detail__block">
                <span className="c-consult-detail__block-label">요청사항</span>
                <p className="c-consult-detail__block-text">{consultation.message}</p>
              </div>
            )}
            {consultation.status === 'REJECTED' && consultation.rejectReason && (
              <div className="c-consult-detail__block">
                <span className="c-consult-detail__block-label">반려 사유</span>
                <p className="c-consult-detail__block-text">{consultation.rejectReason}</p>
              </div>
            )}

            {consultation.status === 'NO_SHOW' && (
              <p className="c-consult-detail__notice">참가업체가 미방문으로 처리한 상담입니다.</p>
            )}

            {editable ? (
              <div className="c-consult-detail__actions">
                <button type="button" className="c-bulk-consult__back" onClick={() => setMode('edit')}>
                  수정
                </button>
                <button type="button" className="c-consult-detail__cancel-btn" disabled={submitting} onClick={handleCancel}>
                  {submitting ? '처리 중...' : '신청 취소'}
                </button>
              </div>
            ) : (
              <p className="c-consult-detail__notice">이미 처리된 상담은 수정·취소할 수 없습니다.</p>
            )}
            {error && <p className="c-consult__error">{error}</p>}
          </>
        ) : (
          <>
            <div className="c-consult__field">
              <span>상담 유형 <span className="c-consult__required">*</span> (최소 1개 선택)</span>
              <div className="c-consult__slots">
                <button type="button" className={wantsPurchase ? 'is-selected' : ''} onClick={() => { setWantsPurchase((v) => !v); clearFieldError('consultType'); }}>
                  구매 상담
                </button>
                <button type="button" className={wantsTestDrive ? 'is-selected' : ''} onClick={() => { setWantsTestDrive((v) => !v); clearFieldError('consultType'); }}>
                  시승 상담
                </button>
              </div>
              {fieldErrors.consultType && <span className="c-consult__error">{fieldErrors.consultType}</span>}
            </div>

            <label className="c-consult__field">
              <span>관심 차종</span>
              <input value={interestedVehicle} onChange={(e) => setInterestedVehicle(e.target.value)} placeholder="예: EV6, 아이오닉5 (선택)" />
            </label>

            {wantsTestDrive && (
              <label className="c-bulk-consult__checkbox-row">
                <input type="checkbox" checked={hasDriverLicense} onChange={(e) => setHasDriverLicense(e.target.checked)} />
                <span>시승을 위한 운전면허를 소지하고 있습니다.</span>
              </label>
            )}

            <div className="c-consult__field">
              <span>방문 희망 날짜 <span className="c-consult__required">*</span></span>
              <p className="c-consult__calendar-legend">
                <span className="c-consult__legend-dot" /> 보유한 입장권 날짜입니다. 입장권이 없는 날짜는 선택할 수 없습니다.
              </p>
              <div className="c-consult__calendar">
                <div className="c-consult__calendar-head">
                  <button type="button" onClick={goToPrevMonth} aria-label="이전 달">&lt;</button>
                  <strong>{viewYear}년 {viewMonth + 1}월</strong>
                  <button type="button" onClick={goToNextMonth} aria-label="다음 달">&gt;</button>
                </div>
                <div className="c-consult__calendar-weekdays">
                  {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
                </div>
                <div className="c-consult__calendar-grid">
                  {calendarCells.map((d, i) => {
                    const iso = d ? toIsoDate(viewYear, viewMonth, d) : null;
                    const hasTicket = d && (ticketDates.has(iso) || iso === consultation.preferredDate);
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={!d || !hasTicket}
                        className={[d && d === selectedDay && 'is-selected', hasTicket && 'has-ticket'].filter(Boolean).join(' ')}
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
              {fieldErrors.date && <span className="c-consult__error">{fieldErrors.date}</span>}
            </div>

            <div className="c-consult__field">
              <span>방문 희망 시간 <span className="c-consult__required">*</span></span>
              <div className="c-consult__slots">
                {CONSULTATION_TIME_SLOTS.map((t) => (
                  <button key={t} type="button" className={t === selectedTime ? 'is-selected' : ''} onClick={() => { setSelectedTime(t); clearFieldError('time'); }}>
                    {t}
                  </button>
                ))}
              </div>
              {fieldErrors.time && <span className="c-consult__error">{fieldErrors.time}</span>}
            </div>

            <label className="c-consult__field">
              <span>기타 요청사항</span>
              <textarea className="c-bulk-consult__textarea" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="자유롭게 작성해주세요. (선택)" />
            </label>

            {error && <p className="c-consult__error">{error}</p>}

            <div className="c-consult-detail__actions">
              <button type="button" className="c-bulk-consult__back" onClick={() => setMode('view')}>
                취소
              </button>
              <button type="button" className="c-consult__submit" disabled={submitting} onClick={handleSave}>
                {submitting ? '저장 중...' : '저장'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ConsultationDetailModal;
