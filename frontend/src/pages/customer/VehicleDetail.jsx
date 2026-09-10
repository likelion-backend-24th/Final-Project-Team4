import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ConsultationCompleteModal from '../../components/customer/ConsultationCompleteModal';
import { CONSULTATION_TIME_SLOTS } from '../../mock/customerData';
import { applyConsultation, getCustomerExpoVehicles, toAssetUrl } from '../../api/expo';
import './VehicleDetail.css';

const TABS = ['차량 소개', '주요 특징', '컬러'];

function buildCalendar(year, month) {
  // month: 0-indexed
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
  return cells;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function VehicleDetail() {
  const { expoId, vehicleId } = useParams();
  const [found, setFound] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  const today = useMemo(() => new Date(), []);

  const [tab, setTab] = useState('차량 소개');
  const [viewYear] = useState(today.getFullYear());
  const [viewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [selectedTime, setSelectedTime] = useState('14:00');
  const [wantsPurchase, setWantsPurchase] = useState(false);
  const [wantsTestDrive, setWantsTestDrive] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [complete, setComplete] = useState(null);

  const calendarCells = useMemo(() => buildCalendar(viewYear, viewMonth), [viewYear, viewMonth]);

  useEffect(() => {
    getCustomerExpoVehicles(expoId)
      .then((groups) => {
        for (const group of groups) {
          const vehicle = group.vehicles.find((v) => String(v.vehicleId) === vehicleId);
          if (vehicle) {
            setFound({ vehicle, group });
            return;
          }
        }
        setLoadError('차량 정보를 찾을 수 없습니다.');
      })
      .catch((err) =>
        setLoadError(err.response?.data?.error?.message ?? '차량 정보를 불러오지 못했습니다.')
      );
  }, [expoId, vehicleId]);

  if (loadError) {
    return <p className="c-vehicle-detail__status">{loadError}</p>;
  }
  if (!found) {
    return <p className="c-vehicle-detail__status">불러오는 중...</p>;
  }

  const { vehicle, group } = found;
  const images = vehicle.images;
  const mainImageUrl = images[activeImageIdx] ? toAssetUrl(images[activeImageIdx].imageUrl) : null;

  const canSubmit =
    (wantsPurchase || wantsTestDrive) &&
    form.name.trim() &&
    form.phone.trim() &&
    form.email.trim() &&
    selectedDay &&
    selectedTime;

  // 백엔드 consultations 스키마엔 이름/연락처 컬럼이 없어, 참가업체가 확인할 수 있도록 message에 함께 담아 보낸다.
  const buildMessage = () => {
    const lines = [`이름: ${form.name}`, `연락처: ${form.phone}`, `이메일: ${form.email}`];
    if (form.message.trim()) lines.push(`요청사항: ${form.message.trim()}`);
    return lines.join('\n');
  };

  const preferredDate = () => {
    const iso = new Date(viewYear, viewMonth, selectedDay);
    const mm = String(iso.getMonth() + 1).padStart(2, '0');
    const dd = String(iso.getDate()).padStart(2, '0');
    return `${iso.getFullYear()}-${mm}-${dd}`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    applyConsultation({
      boothId: vehicle.boothId,
      vehicleId: vehicle.vehicleId,
      wantsPurchase,
      wantsTestDrive,
      preferredDate: preferredDate(),
      preferredTime: selectedTime,
      message: buildMessage(),
    })
      .then(() => {
        const dateLabel = `${viewYear}년 ${viewMonth + 1}월 ${selectedDay}일(${WEEKDAYS[new Date(viewYear, viewMonth, selectedDay).getDay()]})`;
        setComplete({
          vehicleName: vehicle.name,
          schedule: `${dateLabel} ${selectedTime}`,
          phone: form.phone,
          email: form.email,
        });
      })
      .catch((err) =>
        setSubmitError(err.response?.data?.error?.message ?? '상담 신청에 실패했습니다.')
      )
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="c-vehicle-detail">
      <div className="c-vehicle-detail__crumb">
        <Link to="/customer">홈</Link> &gt; <span>{group.title}</span> &gt; <span>{vehicle.name}</span>
      </div>

      <div className="c-vehicle-detail__body">
        <div className="c-vehicle-detail__main">
          <div className="c-vehicle-detail__gallery">
            <div className="c-vehicle-detail__gallery-main">
              {mainImageUrl && <img src={mainImageUrl} alt={vehicle.name} />}
            </div>
            {images.length > 0 && (
              <div className="c-vehicle-detail__gallery-thumbs">
                {images.map((img, i) => (
                  <button
                    key={img.imageId}
                    type="button"
                    className={`c-vehicle-detail__gallery-thumb${i === activeImageIdx ? ' is-active' : ''}`}
                    onClick={() => setActiveImageIdx(i)}
                  >
                    <img src={toAssetUrl(img.imageUrl)} alt={`${vehicle.name} ${i + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <h1>{vehicle.name}</h1>
          <p className="c-vehicle-detail__summary">{vehicle.summary}</p>
          <div className="c-vehicle-detail__tags">
            {vehicle.tags.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>

          <p className="c-vehicle-detail__price">
            시작 가격 <strong>{vehicle.startPrice.toLocaleString()}원</strong>
          </p>

          <div className="c-vehicle-detail__specs">
            <div className="c-vehicle-detail__spec">
              <span className="c-vehicle-detail__spec-label">1회 충전 주행거리</span>
              <span className="c-vehicle-detail__spec-value">{vehicle.range}</span>
            </div>
            <div className="c-vehicle-detail__spec">
              <span className="c-vehicle-detail__spec-label">배터리 용량</span>
              <span className="c-vehicle-detail__spec-value">{vehicle.battery}</span>
            </div>
            <div className="c-vehicle-detail__spec">
              <span className="c-vehicle-detail__spec-label">최대 출력</span>
              <span className="c-vehicle-detail__spec-value">{vehicle.power}</span>
            </div>
          </div>

          <nav className="c-vehicle-detail__tabs">
            {TABS.map((t) => (
              <button key={t} type="button" className={tab === t ? 'is-active' : ''} onClick={() => setTab(t)}>
                {t}
              </button>
            ))}
          </nav>

          <section className="c-vehicle-detail__tabcontent">
            {tab === '차량 소개' && vehicle.description.split('\n').map((line) => <p key={line}>{line}</p>)}
            {tab === '주요 특징' &&
              (vehicle.features
                ? vehicle.features.split('\n').map((line) => <p key={line}>{line}</p>)
                : <p>등록된 주요 특징 정보가 없습니다.</p>)}
            {tab === '컬러' &&
              (vehicle.colors
                ? vehicle.colors.split('\n').map((line) => <p key={line}>{line}</p>)
                : <p>등록된 컬러 정보가 없습니다.</p>)}
          </section>
        </div>

        <aside className="c-vehicle-detail__side">
          <form className="c-consult" onSubmit={handleSubmit}>
            <h2>상담 신청</h2>
            <p className="c-consult__desc">전문 상담사가 친절하게 상담해드립니다.</p>

            <div className="c-consult__field">
              <span>상담 유형 * (최소 1개 선택)</span>
              <div className="c-consult__slots">
                <button
                  type="button"
                  className={wantsPurchase ? 'is-selected' : ''}
                  onClick={() => setWantsPurchase((v) => !v)}
                >
                  구매 상담
                </button>
                <button
                  type="button"
                  className={wantsTestDrive ? 'is-selected' : ''}
                  onClick={() => setWantsTestDrive((v) => !v)}
                >
                  시승 상담
                </button>
              </div>
            </div>

            <label className="c-consult__field">
              <span>이름 *</span>
              <input
                placeholder="이름을 입력하세요."
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>
            <label className="c-consult__field">
              <span>전화번호 *</span>
              <input
                placeholder="010-1234-5678"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </label>
            <label className="c-consult__field">
              <span>이메일 *</span>
              <input
                type="email"
                placeholder="example@domain.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </label>

            <div className="c-consult__field">
              <span>상담 희망 날짜 *</span>
              <div className="c-consult__calendar">
                <div className="c-consult__calendar-head">
                  <span>&lt;</span>
                  <strong>{viewYear}년 {viewMonth + 1}월</strong>
                  <span>&gt;</span>
                </div>
                <div className="c-consult__calendar-weekdays">
                  {WEEKDAYS.map((w) => (
                    <span key={w}>{w}</span>
                  ))}
                </div>
                <div className="c-consult__calendar-grid">
                  {calendarCells.map((d, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={!d}
                      className={d === selectedDay ? 'is-selected' : ''}
                      onClick={() => d && setSelectedDay(d)}
                    >
                      {d ?? ''}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="c-consult__field">
              <span>상담 희망 시간 *</span>
              <div className="c-consult__slots">
                {CONSULTATION_TIME_SLOTS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={t === selectedTime ? 'is-selected' : ''}
                    onClick={() => setSelectedTime(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <label className="c-consult__field">
              <span>요청사항</span>
              <input
                placeholder="문의하고 싶은 내용을 입력하세요. (선택)"
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              />
            </label>

            {submitError && <p className="c-consult__error">{submitError}</p>}

            <button type="submit" className="c-consult__submit" disabled={!canSubmit || submitting}>
              {submitting ? '신청 중...' : '상담 신청하기'}
            </button>
          </form>
        </aside>
      </div>

      {complete && <ConsultationCompleteModal summary={complete} onClose={() => setComplete(null)} />}
    </div>
  );
}

export default VehicleDetail;
