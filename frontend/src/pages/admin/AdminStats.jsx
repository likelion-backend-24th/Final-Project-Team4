import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getAdminExpoList } from '../../api/expo';
import { getPaymentStats, getRefundLogs } from '../../api/payment';
import { getCheckInLogs, getCheckInStats, getHourlyCheckIns } from '../../api/reservation';
import BarChart from '../../components/BarChart';
import CheckInLogList from '../../components/CheckInLogList';
import DonutChart from '../../components/DonutChart';
import RefundLogList from '../../components/RefundLogList';
import { WEEKDAYS, buildCalendar, offsetIsoDate, shiftIsoDate, toIsoDate } from '../../utils/calendar';
import { EMPTY_DAY, mergeDaily, ratio, won } from '../../utils/statsFormat';
import './AdminApplications.css';
import './AdminRevenueStats.css';
import './AdminDashboard.css';
import './AdminStats.css';

// 전일 대비 증감 문구와 색(up, down)
const vsPrev = (cur, prev, unit) => {
  const diff = cur - prev;
  return {
    text: `전일 대비 ${diff >= 0 ? '+' : '-'}${Math.abs(diff).toLocaleString()}${unit}`,
    tone: diff === 0 ? '' : diff > 0 ? 'up' : 'down',
  };
};

const HOUR_MODES = [
  { key: 'count', label: '전체' },
  { key: 'free', label: '무료' },
  { key: 'paid', label: '유료' },
];

// 통계 - 달력에서 날짜를 고르면 같은 화면 아래에 그날 상세가 나옴
// 박람회, 월, 선택 날짜는 URL(?expoId=&month=YYYY-MM&date=YYYY-MM-DD)에 둬서 새로고침, 뒤로가기에도 유지됨
function AdminStats() {
  const [params, setParams] = useSearchParams();
  const [expos, setExpos] = useState([]);
  const [daily, setDaily] = useState({});
  const [payments, setPayments] = useState([]);
  const [hourly, setHourly] = useState([]);
  const [logs, setLogs] = useState([]);
  const [refundLogs, setRefundLogs] = useState([]);
  const [hourMode, setHourMode] = useState('count');
  const [loadError, setLoadError] = useState(null);

  const todayIso = offsetIsoDate(0);
  const month = params.get('month') ?? todayIso.slice(0, 7);
  const [year, mon] = month.split('-').map(Number);
  const defaultExpo = expos.find((e) => e.status === 'OPEN') ?? expos[0];
  const expoId = params.get('expoId') ?? String(defaultExpo?.expoId ?? '');

  const monthFirst = toIsoDate(year, mon - 1, 1);
  const monthLast = toIsoDate(year, mon - 1, new Date(year, mon, 0).getDate());
  // 선택 날짜 기본값 - 이번 달이면 오늘, 지난 달이면 그 달 마지막 날, 다음 달이면 고르지 않음
  const fallbackDate = todayIso >= monthLast ? monthLast : todayIso >= monthFirst ? todayIso : null;
  const selected = params.get('date') ?? fallbackDate;

  useEffect(() => {
    getAdminExpoList({ size: 1000 })
      .then((res) => setExpos(res.content ?? []))
      .catch((err) => setLoadError(err.response?.data?.error?.message ?? '박람회 목록을 불러오지 못했습니다.'));
  }, []);

  // 달력에 쓸 한 달치. 1일의 전일 대비도 계산할 수 있게 하루 앞에서부터 조회함
  useEffect(() => {
    if (!expoId) return;
    const from = shiftIsoDate(monthFirst, -1);
    Promise.all([getPaymentStats({ expoId, from, to: monthLast }), getCheckInStats({ expoId, from, to: monthLast })])
      .then(([paymentRows, checkIns]) => {
        setPayments(paymentRows);
        setDaily(mergeDaily(paymentRows, checkIns));
        setLoadError(null);
      })
      .catch((err) => setLoadError(err.response?.data?.error?.message ?? '통계를 불러오지 못했습니다.'));
  }, [expoId, monthFirst, monthLast]);

  // 선택한 날짜의 시간대별 입장, 입장 내역, 취소표 내역
  useEffect(() => {
    if (!expoId || !selected) return;
    Promise.all([
      getHourlyCheckIns({ expoId, date: selected }),
      getCheckInLogs({ expoId, date: selected }),
      getRefundLogs({ expoId, date: selected }),
    ])
      .then(([hourlyRows, logRows, refundRows]) => {
        setHourly(hourlyRows);
        setLogs(logRows);
        setRefundLogs(refundRows);
      })
      .catch((err) => setLoadError(err.response?.data?.error?.message ?? '입장 현황을 불러오지 못했습니다.'));
  }, [expoId, selected]);

  // 월을 옮기면 선택 날짜는 비워서 그 달의 기본값(fallbackDate)을 따르게 함
  const moveMonth = (delta) => {
    const d = new Date(year, mon - 1 + delta, 1);
    setParams({ expoId, month: toIsoDate(d.getFullYear(), d.getMonth(), 1).slice(0, 7) });
  };

  const stat = (selected && daily[selected]) || EMPTY_DAY;
  const prevStat = (selected && daily[shiftIsoDate(selected, -1)]) || EMPTY_DAY;
  const visitCompare = vsPrev(stat.visit, prevStat.visit, '명');
  const netCompare = vsPrev(stat.net, prevStat.net, '원');

  // 그날 유료 입장권 매출 - 무료 입장권은 매출이 없으므로 0원
  const ticketRevenue = payments.find((p) => p.date === selected && p.source === 'DAY_TICKET')?.paidAmount ?? 0;

  // 시간대별 - 기본 9~18시, 이 밖의 시간대에 체크인이 있으면 범위를 넓힘
  const byHour = Object.fromEntries(hourly.map((h) => [h.hour, h]));
  const hours = hourly.map((h) => h.hour);
  const fromHour = Math.min(9, ...hours);
  const toHour = Math.max(18, ...hours);
  const hourItems = Array.from({ length: toHour - fromHour + 1 }, (_, i) => fromHour + i).map((h) => ({
    label: `${h}시`,
    value: byHour[h]?.[hourMode] ?? 0,
    active: false,
  }));

  return (
    <div className="admin-applications">
      <section className="admin-applications__hero">
        <p className="admin-applications__eyebrow">EXHIBITOR MANAGEMENT PORTAL</p>
        <h1>통계</h1>
        <p>박람회 입장, 매출, 방문자 등의 상세 통계를 확인할 수 있습니다.</p>
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
        <button
          type="button"
          className="admin-stats__today"
          onClick={() => setParams({ expoId, month: todayIso.slice(0, 7), date: todayIso })}
        >
          오늘
        </button>
        <Link to="/admin/stats/payments" className="admin-stats__link">결제 내역 표로 보기</Link>
      </section>

      {loadError && <p className="admin-applications__error">{loadError}</p>}

      <section className="admin-dashboard__card">
        <h3>일별 현황</h3>
        <div className="admin-stats__calendar">
          {WEEKDAYS.map((w) => (
            <div key={w} className="admin-stats__dow">{w}</div>
          ))}
          {buildCalendar(year, mon - 1).map((d, i) => {
            if (d === null) return <div key={`blank-${i}`} />;
            const iso = toIsoDate(year, mon - 1, d);
            return (
              <button
                key={iso}
                type="button"
                className={`admin-stats__cell${iso === selected ? ' is-selected' : ''}${iso === todayIso ? ' is-today' : ''}`}
                disabled={iso > todayIso}
                onClick={() => setParams({ expoId, month, date: iso })}
              >
                <b>{d}</b>
                <span className="admin-stats__net">입장: {(daily[iso] ?? EMPTY_DAY).visit}</span>
              </button>
            );
          })}
        </div>
        <p className="admin-stats__hint">셀의 숫자는 그날 입장(체크인) 인원입니다.</p>
      </section>

      {selected && (
        <>
          <section className="admin-applications__stats admin-stats__summary">
            <div className="admin-stat-card">
              <p>총 입장 인원</p>
              <strong>{stat.visit.toLocaleString()}명</strong>
              <span className={`admin-dashboard__sub is-${visitCompare.tone}`}>{visitCompare.text}</span>
            </div>
            <div className="admin-stat-card">
              <p>무료 입장권</p>
              <strong>{stat.free.toLocaleString()}명</strong>
              <span className="admin-dashboard__sub">{ratio(stat.free, stat.visit)}%</span>
            </div>
            <div className="admin-stat-card">
              <p>유료 입장권</p>
              <strong>{stat.paid.toLocaleString()}명</strong>
              <span className="admin-dashboard__sub">{ratio(stat.paid, stat.visit)}%</span>
            </div>
            <div className="admin-stat-card">
              <p>취소표</p>
              <strong className="is-rejected">{stat.cancel}장</strong>
              <span className="admin-dashboard__sub">환불 금액 {won(stat.refund)}</span>
            </div>
            <div className="admin-stat-card">
              <p>해당일 순매출</p>
              <strong>{won(stat.net)}</strong>
              <span className={`admin-dashboard__sub is-${netCompare.tone}`}>{netCompare.text}</span>
            </div>
          </section>

          <div className="admin-dashboard__grid admin-dashboard__grid--wide-right">
            <section className="admin-dashboard__card">
              <h3>입장권 유형별 비율</h3>
              <div className="admin-dashboard__chart">
                <DonutChart
                  centerLabel="총 입장 인원"
                  items={[
                    { label: '무료 입장권', value: stat.free, color: '#bfdbfe' },
                    { label: '유료 입장권', value: stat.paid, color: '#2f6bff' },
                  ]}
                />
              </div>
            </section>

            <section className="admin-dashboard__card">
              <h3>
                시간대별 입장 인원 ({selected})
                <span className="admin-stats__toggle">
                  {HOUR_MODES.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      className={hourMode === m.key ? 'is-active' : ''}
                      onClick={() => setHourMode(m.key)}
                    >
                      {m.label}
                    </button>
                  ))}
                </span>
              </h3>
              <div className="admin-dashboard__chart">
                <BarChart items={hourItems} />
              </div>
            </section>
          </div>

          <div className="admin-dashboard__grid admin-dashboard__grid--three">
            <section className="admin-dashboard__card">
              <h3>입장권 상세</h3>
              <table className="admin-applications__table">
                <thead>
                  <tr>
                    <th>구분</th>
                    <th>입장</th>
                    <th>비율</th>
                    <th>매출액</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>무료</td>
                    <td>{stat.free}명</td>
                    <td>{ratio(stat.free, stat.visit)}%</td>
                    <td>0원</td>
                  </tr>
                  <tr>
                    <td>유료</td>
                    <td>{stat.paid}명</td>
                    <td>{ratio(stat.paid, stat.visit)}%</td>
                    <td>{won(ticketRevenue)}</td>
                  </tr>
                  <tr>
                    <td className="is-strong">합계</td>
                    <td className="is-strong">{stat.visit}명</td>
                    <td className="is-strong">{stat.visit === 0 ? 0 : 100}%</td>
                    <td className="is-strong">{won(ticketRevenue)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="admin-stats__hint">
                입장 인원은 체크인 수, 매출액은 그날 결제된 당일 입장권 금액입니다.
              </p>
            </section>

            <section className="admin-dashboard__card">
              <h3>입장 현황 ({selected})</h3>
              <CheckInLogList logs={logs} />
              <p className="admin-stats__hint">최근 입장 20건까지 노출됩니다.</p>
            </section>

            <section className="admin-dashboard__card">
              <h3>취소표 내역 ({selected})</h3>
              <RefundLogList logs={refundLogs} />
              <p className="admin-stats__hint">최근 환불 20건까지 노출됩니다.</p>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminStats;
