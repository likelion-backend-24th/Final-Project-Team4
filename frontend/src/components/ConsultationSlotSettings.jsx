import { useEffect, useState } from 'react';
import { getConsultationSlotSettings, getCustomerExpo, saveConsultationSlotSettings } from '../api/expo';
import { CONSULTATION_TIME_SLOTS } from '../mock/customerData';
import { buildCalendar, expoDateRange, toIsoDate, WEEKDAYS } from '../utils/calendar';

const fmtDate = (iso) => `${iso.slice(5).replace('-', '.')}(${WEEKDAYS[new Date(`${iso}T00:00:00Z`).getUTCDay()]})`;
const monthIndex = (iso) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1;

// 참가업체가 날짜·시간 슬롯마다 받을 상담 건수를 지정한다. 박람회 기간을 달력으로 보여주고, 날짜를 누르면 그 날짜의
// 시간대별 건수를 입력한다. 빈 칸이면 위의 "기본 접수 건수"가 적용되고, 값을 적은 칸만 그 슬롯의 정원으로 저장된다(0이면 마감).
function ConsultationSlotSettings({ boothId, expoId }) {
  const [dates, setDates] = useState([]);
  const [view, setView] = useState(null); // { year, month(0-indexed) }
  const [selectedDate, setSelectedDate] = useState(null);
  const [defaultCapacity, setDefaultCapacity] = useState('1');
  const [cells, setCells] = useState({}); // { 'YYYY-MM-DD|HH:mm': '2' }
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([getCustomerExpo(expoId), getConsultationSlotSettings(boothId)])
      .then(([expo, settings]) => {
        const range = expoDateRange(expo);
        setDates(range);
        setSelectedDate(range[0]);
        setView({ year: Number(range[0].slice(0, 4)), month: Number(range[0].slice(5, 7)) - 1 });
        setDefaultCapacity(String(settings.defaultCapacity));
        setCells(Object.fromEntries(settings.slots.map((s) => [`${s.date}|${s.time.slice(0, 5)}`, String(s.capacity)])));
      })
      .catch((err) => setLoadError(err.response?.data?.error?.message ?? '상담 접수 설정을 불러오지 못했습니다.'));
  }, [boothId, expoId]);

  const setCell = (key, value) => {
    setMessage(null);
    setCells((prev) => ({ ...prev, [key]: value.replace(/\D/g, '').slice(0, 3) }));
  };

  const dateSet = new Set(dates);

  // 달력 칸에 보여줄 요약 - 기본값과 다른 슬롯 수(changed)와 0건(마감) 슬롯 수(closed).
  const summarize = (iso) => {
    let changed = 0;
    let closed = 0;
    CONSULTATION_TIME_SLOTS.forEach((t) => {
      const v = cells[`${iso}|${t}`];
      if (v === undefined || v === '') return;
      if (Number(v) === 0) closed += 1;
      else if (Number(v) !== Number(defaultCapacity)) changed += 1;
    });
    return { changed, closed };
  };

  const canMove = (delta) => {
    const cur = view.year * 12 + view.month + delta;
    return cur >= monthIndex(dates[0]) && cur <= monthIndex(dates[dates.length - 1]);
  };

  const moveMonth = (delta) => {
    const cur = view.year * 12 + view.month + delta;
    setView({ year: Math.floor(cur / 12), month: cur % 12 });
  };

  const handleSave = () => {
    if (defaultCapacity === '') {
      setError('기본 접수 건수를 입력해주세요.');
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    saveConsultationSlotSettings(boothId, {
      defaultCapacity: Number(defaultCapacity),
      slots: Object.entries(cells)
        .filter(([, v]) => v !== '')
        .map(([key, v]) => {
          const [date, time] = key.split('|');
          return { date, time: `${time}:00`, capacity: Number(v) };
        }),
    })
      .then(() => setMessage('저장되었습니다.'))
      .catch((err) => setError(err.response?.data?.error?.message ?? '저장에 실패했습니다.'))
      .finally(() => setSaving(false));
  };

  if (loadError) return <p className="booth-manage__error">{loadError}</p>;

  return (
    <>
      <label className="booth-manage__field booth-manage__slot-default">
        <span>기본 접수 건수 (시간대당)</span>
        <input
          inputMode="numeric"
          value={defaultCapacity}
          onChange={(e) => {
            setMessage(null);
            setDefaultCapacity(e.target.value.replace(/\D/g, '').slice(0, 3));
          }}
        />
      </label>

      {view && (
        <div className="booth-manage__slot-layout">
          <div className="booth-manage__slot-calendar">
            <div className="booth-manage__slot-cal-head">
              <button type="button" onClick={() => moveMonth(-1)} disabled={!canMove(-1)} aria-label="이전 달">
                &lt;
              </button>
              <strong>
                {view.year}년 {view.month + 1}월
              </strong>
              <button type="button" onClick={() => moveMonth(1)} disabled={!canMove(1)} aria-label="다음 달">
                &gt;
              </button>
            </div>
            <div className="booth-manage__slot-cal-grid">
              {WEEKDAYS.map((w) => (
                <span key={w} className="booth-manage__slot-cal-weekday">
                  {w}
                </span>
              ))}
              {buildCalendar(view.year, view.month).map((d, i) => {
                const iso = d ? toIsoDate(view.year, view.month, d) : null;
                if (!d || !dateSet.has(iso)) {
                  return (
                    <span key={i} className="booth-manage__slot-cal-cell is-off">
                      {d ?? ''}
                    </span>
                  );
                }
                const { changed, closed } = summarize(iso);
                return (
                  <button
                    key={i}
                    type="button"
                    className={`booth-manage__slot-cal-cell${iso === selectedDate ? ' is-selected' : ''}`}
                    onClick={() => setSelectedDate(iso)}
                  >
                    {d}
                    {closed > 0 && <small className="is-closed">마감 {closed}</small>}
                    {closed === 0 && changed > 0 && <small className="is-changed">변경 {changed}</small>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="booth-manage__slot-day">
            <h3>{fmtDate(selectedDate)} 시간대별 접수 건수</h3>
            <div className="booth-manage__slot-times">
              {CONSULTATION_TIME_SLOTS.map((t) => {
                const key = `${selectedDate}|${t}`;
                const v = cells[key] ?? '';
                const state =
                  v === '' ? '' : Number(v) === 0 ? ' is-closed' : Number(v) !== Number(defaultCapacity) ? ' is-changed' : '';
                return (
                  <label key={t} className={`booth-manage__slot-time${state}`}>
                    <span>{t}</span>
                    <input
                      inputMode="numeric"
                      value={v}
                      placeholder={defaultCapacity}
                      onChange={(e) => setCell(key, e.target.value)}
                      aria-label={`${selectedDate} ${t} 접수 건수`}
                    />
                    {state === ' is-closed' && <em>마감</em>}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <p className="booth-manage__section-desc">
        빈 칸은 기본 접수 건수가 적용되고, 0을 입력하면 그 시간대는 접수가 마감됩니다. 기본값과 다르게 지정한 칸은 파란색, 마감은
        회색으로 표시됩니다. 이미 접수된 상담은 건수를 줄여도 유지됩니다.
      </p>

      {error && <p className="booth-manage__error">{error}</p>}
      {message && <p className="booth-manage__success">{message}</p>}
      <button type="button" disabled={saving} onClick={handleSave}>
        {saving ? '저장 중...' : '저장'}
      </button>
    </>
  );
}

export default ConsultationSlotSettings;
