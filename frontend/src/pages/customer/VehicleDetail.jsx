import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ConsultationCompleteModal from '../../components/customer/ConsultationCompleteModal';
import { CONSULTATION_TIME_SLOTS, findVehicle } from '../../mock/customerData';
import './VehicleDetail.css';

const TABS = ['차량 소개', '주요 특징', '컬러', '다운로드'];

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
  const found = findVehicle(expoId, vehicleId);

  const [tab, setTab] = useState('차량 소개');
  const [viewYear] = useState(2026);
  const [viewMonth] = useState(4); // 5월 (0-indexed)
  const [selectedDay, setSelectedDay] = useState(14);
  const [selectedTime, setSelectedTime] = useState('14:00');
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(null);

  const calendarCells = useMemo(() => buildCalendar(viewYear, viewMonth), [viewYear, viewMonth]);

  if (!found) {
    return <p className="c-vehicle-detail__status">차량 정보를 찾을 수 없습니다.</p>;
  }

  const { vehicle, group } = found;

  const canSubmit =
    form.name.trim() && form.phone.trim() && form.email.trim() && selectedDay && selectedTime;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    // 상담 신청 API는 Expo 서비스 소유(consultations)이며 아직 백엔드에 없어 화면 확인용으로 목업 처리.
    setTimeout(() => {
      setSubmitting(false);
      const dateLabel = `${viewYear}년 ${viewMonth + 1}월 ${selectedDay}일(${WEEKDAYS[new Date(viewYear, viewMonth, selectedDay).getDay()]})`;
      setComplete({
        vehicleName: vehicle.name,
        schedule: `${dateLabel} ${selectedTime}`,
        phone: form.phone,
        email: form.email,
      });
    }, 300);
  };

  return (
    <div className="c-vehicle-detail">
      <div className="c-vehicle-detail__crumb">
        <Link to="/customer">홈</Link> &gt; <span>{group.name}</span> &gt; <span>{vehicle.name}</span>
      </div>

      <div className="c-vehicle-detail__body">
        <div className="c-vehicle-detail__main">
          <div className="c-vehicle-detail__gallery">
            <div className="c-vehicle-detail__gallery-main" />
            <div className="c-vehicle-detail__gallery-thumbs">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="c-vehicle-detail__gallery-thumb" />
              ))}
            </div>
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

          <div className="c-vehicle-detail__linkrow">
            <span>주요 제원 보기 &gt;</span>
            <span>옵션 및 트림 보기 &gt;</span>
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
            {tab === '주요 특징' && <p>{vehicle.name}의 주요 특징 콘텐츠 영역입니다.</p>}
            {tab === '컬러' && <p>{vehicle.name}의 컬러 옵션 콘텐츠 영역입니다.</p>}
            {tab === '다운로드' && <p>{vehicle.name}의 카탈로그/자료 다운로드 영역입니다.</p>}
          </section>
        </div>

        <aside className="c-vehicle-detail__side">
          <form className="c-consult" onSubmit={handleSubmit}>
            <h2>상담 신청</h2>
            <p className="c-consult__desc">전문 상담사가 친절하게 상담해드립니다.</p>

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
