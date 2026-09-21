import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getAdminExpoList } from '../../api/expo';
import { getPaymentStats } from '../../api/payment';
import { getCheckInStats } from '../../api/reservation';
import { WEEKDAYS, buildCalendar, offsetIsoDate, toIsoDate } from '../../utils/calendar';
import { EMPTY_DAY, man, mergeDaily, sum, won } from '../../utils/statsFormat';
import './AdminApplications.css';
import './AdminRevenueStats.css';
import './AdminStats.css';

// 매출 달력 - 날짜별 순매출, 방문자, 취소표를 보여주고 날짜를 누르면 상세 화면으로 이동
// 박람회와 월은 URL(?expoId=&month=YYYY-MM)에 둬서 상세 화면에서 돌아와도 유지됨
function AdminStatsCalendar() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [expos, setExpos] = useState([]);
  const [daily, setDaily] = useState({});
  const [loadError, setLoadError] = useState(null);

  const now = new Date();
  const month = params.get('month') ?? toIsoDate(now.getFullYear(), now.getMonth(), 1).slice(0, 7);
  const [year, mon] = month.split('-').map(Number);
  const defaultExpo = expos.find((e) => e.status === 'OPEN') ?? expos[0];
  const expoId = params.get('expoId') ?? String(defaultExpo?.expoId ?? '');
  const todayIso = offsetIsoDate(0);

  useEffect(() => {
    getAdminExpoList({ size: 1000 })
      .then((res) => setExpos(res.content ?? []))
      .catch((err) => setLoadError(err.response?.data?.error?.message ?? '박람회 목록을 불러오지 못했습니다.'));
  }, []);

  useEffect(() => {
    if (!expoId) return;
    const from = toIsoDate(year, mon - 1, 1);
    const to = toIsoDate(year, mon - 1, new Date(year, mon, 0).getDate());
    Promise.all([getPaymentStats({ expoId, from, to }), getCheckInStats({ expoId, from, to })])
      .then(([payments, checkIns]) => {
        setDaily(mergeDaily(payments, checkIns));
        setLoadError(null);
      })
      .catch((err) => setLoadError(err.response?.data?.error?.message ?? '통계를 불러오지 못했습니다.'));
  }, [expoId, year, mon]);

  const moveMonth = (delta) => {
    const d = new Date(year, mon - 1 + delta, 1);
    setParams({ expoId, month: toIsoDate(d.getFullYear(), d.getMonth(), 1).slice(0, 7) });
  };

  const days = Object.values(daily);

  return (
    <div className="admin-applications">
      <section className="admin-applications__hero">
        <p className="admin-applications__eyebrow">EXHIBITOR MANAGEMENT PORTAL</p>
        <h1>매출 통계</h1>
        <p>날짜별 매출, 방문자, 취소표를 확인하고 날짜를 누르면 상세 내역을 볼 수 있습니다.</p>
      </section>

      <section className="admin-revenue-stats__filters">
        <select value={expoId} onChange={(e) => setParams({ expoId: e.target.value, month })}>
          {expos.map((expo) => (
            <option key={expo.expoId} value={expo.expoId}>{expo.title}</option>
          ))}
        </select>
        <button type="button" onClick={() => moveMonth(-1)} aria-label="이전 달">&lt;</button>
        <span className="admin-stats__month">{year}년 {mon}월</span>
        <button type="button" onClick={() => moveMonth(1)} aria-label="다음 달">&gt;</button>
        <Link to="/admin/stats/payments" className="admin-stats__link">결제 내역 표로 보기</Link>
      </section>

      {loadError && <p className="admin-applications__error">{loadError}</p>}

      <section className="admin-applications__stats">
        <div className="admin-stat-card">
          <p>이번 달 순매출</p>
          <strong>{won(sum(days, 'net'))}</strong>
        </div>
        <div className="admin-stat-card">
          <p>방문자 (체크인)</p>
          <strong>{sum(days, 'visit').toLocaleString()}명</strong>
        </div>
        <div className="admin-stat-card">
          <p>취소표</p>
          <strong className="is-rejected">{sum(days, 'cancel')}장</strong>
        </div>
        <div className="admin-stat-card">
          <p>결제 건수</p>
          <strong>{sum(days, 'payCount').toLocaleString()}건</strong>
        </div>
      </section>

      <section className="admin-stats__calendar">
        {WEEKDAYS.map((w) => (
          <div key={w} className="admin-stats__dow">{w}</div>
        ))}
        {buildCalendar(year, mon - 1).map((d, i) => {
          if (d === null) return <div key={`blank-${i}`} />;
          const iso = toIsoDate(year, mon - 1, d);
          const s = daily[iso] ?? EMPTY_DAY;
          return (
            <button
              key={iso}
              type="button"
              className={`admin-stats__cell${iso === todayIso ? ' is-today' : ''}`}
              disabled={iso > todayIso}
              onClick={() => navigate(`/admin/stats/days/${iso}?expoId=${expoId}`)}
            >
              <b>{d}</b>
              {s.net !== 0 && <span className="admin-stats__net">{man(s.net)}</span>}
              {s.visit > 0 && <span>방문 {s.visit}</span>}
              {s.cancel > 0 && <span className="is-rejected">취소 {s.cancel}</span>}
            </button>
          );
        })}
      </section>
      <p className="admin-stats__hint">셀의 숫자는 순매출, 방문자, 취소표 순서입니다.</p>
    </div>
  );
}

export default AdminStatsCalendar;
