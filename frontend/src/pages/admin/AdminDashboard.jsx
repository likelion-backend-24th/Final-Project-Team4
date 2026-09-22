import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminExpoBooths, getAdminExpoList } from '../../api/expo';
import { getPaymentStats } from '../../api/payment';
import { getCheckInLogs, getCheckInStats, getHourlyCheckIns, getTicketStats } from '../../api/reservation';
import BarChart from '../../components/BarChart';
import CheckInLogList from '../../components/CheckInLogList';
import DonutChart from '../../components/DonutChart';
import LineChart from '../../components/LineChart';
import { isFoodBooth } from '../../utils/boothType';
import { offsetIsoDate } from '../../utils/calendar';
import { EMPTY_DAY, dayLabel, man, mergeDaily, ratio, sum, won } from '../../utils/statsFormat';
import './AdminApplications.css';
import './AdminRevenueStats.css';
import './AdminDashboard.css';

// 전일 대비 문구와 색(up, down). 어제 값이 0이면 퍼센트는 빼고 차이만 보여줌
const compare = (cur, prev, fmt) => {
  const diff = cur - prev;
  if (diff === 0) return { text: '어제와 같음', tone: '' };
  const pct = prev === 0 ? '' : `${diff > 0 ? '+' : '-'}${Math.abs(Math.round((diff / prev) * 100))}% `;
  return {
    text: `${diff > 0 ? '▲' : '▼'} ${pct}어제보다 ${fmt(Math.abs(diff))} ${diff > 0 ? '증가' : '감소'}`,
    tone: diff > 0 ? 'up' : 'down',
  };
};

function ProgressBar({ pct }) {
  return (
    <div className="admin-dashboard__bar">
      <div style={{ width: `${pct}%` }} />
    </div>
  );
}

function AdminDashboard() {
  const [expos, setExpos] = useState([]);
  const [expoId, setExpoId] = useState('');
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);

  // 박람회 목록 - 선택 박람회는 진행 중(OPEN)인 첫 박람회를 기본값으로 함
  useEffect(() => {
    getAdminExpoList({ size: 1000 })
      .then((res) => {
        const list = res.content ?? [];
        setExpos(list);
        const initial = list.find((e) => e.status === 'OPEN') ?? list[0];
        if (initial) setExpoId(String(initial.expoId));
      })
      .catch((err) => setLoadError(err.response?.data?.error?.message ?? '박람회 목록을 불러오지 못했습니다.'));
  }, []);

  // 선택한 박람회의 지표. 어제 비교와 최근 7일 추이를 위해 결제, 체크인은 6일 전~오늘을 한 번에 조회
  useEffect(() => {
    if (!expoId) return;
    const today = offsetIsoDate(0);
    const weekStart = offsetIsoDate(-6);
    Promise.all([
      getAdminExpoBooths(expoId),
      getPaymentStats({ expoId, from: weekStart, to: today }),
      getCheckInStats({ expoId, from: weekStart, to: today }),
      getHourlyCheckIns({ expoId, date: today }),
      getTicketStats(expoId),
      getCheckInLogs({ expoId, date: today }),
    ])
      .then(([boothRes, payments, checkIns, hourly, tickets, logs]) => {
        setData({ expoId, booths: boothRes.booths, payments, checkIns, hourly, tickets, logs, today });
        setLoadError(null);
      })
      .catch((err) => setLoadError(err.response?.data?.error?.message ?? '대시보드 현황을 불러오지 못했습니다.'));
  }, [expoId]);

  // 처리할 일 - 전체 박람회 기준. 0건인 항목은 숨김
  const pending = sum(expos, 'pendingCount');
  const todos = [
    { label: '부스 신청 심사 대기', count: pending, unit: '건', badge: 'admin-badge--pending', to: '/admin/applications' },
    { label: '결제 대기 중인 신청', count: sum(expos, 'paymentPendingCount'), unit: '건', badge: 'admin-badge--reserved', to: '/admin/applications' },
    { label: '공개 전환이 안 된 박람회', count: expos.filter((e) => e.status === 'DRAFT').length, unit: '개', badge: 'admin-badge--reserved', to: '/admin/applications' },
  ].filter((t) => t.count > 0);

  return (
    <div className="admin-applications">
      <section className="admin-applications__hero">
        <p className="admin-applications__eyebrow">EXHIBITOR MANAGEMENT PORTAL</p>
        <h1>관리자 대시보드</h1>
        <p>박람회의 전반적인 현황을 한눈에 확인합니다.</p>
      </section>

      <section className="admin-revenue-stats__filters">
        <select value={expoId} onChange={(e) => setExpoId(e.target.value)}>
          {expos.map((expo) => (
            <option key={expo.expoId} value={expo.expoId}>{expo.title}</option>
          ))}
        </select>
      </section>

      {loadError && <p className="admin-applications__error">{loadError}</p>}

      {data && <DashboardBody data={data} pending={pending} todos={todos} />}
    </div>
  );
}

// 선택한 박람회의 데이터가 준비된 뒤에 그리는 본문
function DashboardBody({ data, pending, todos }) {
  const { expoId, booths, payments, checkIns, hourly, tickets, logs, today } = data;

  const daily = mergeDaily(payments, checkIns);
  const todayStat = daily[today] ?? EMPTY_DAY;
  const yesterdayStat = daily[offsetIsoDate(-1)] ?? EMPTY_DAY;
  const netCompare = compare(todayStat.net, yesterdayStat.net, won);

  // 최근 7일(오늘 포함) 날짜와 그래프용 값
  const weekDates = Array.from({ length: 7 }, (_, i) => offsetIsoDate(i - 6));
  const weekValues = (key) => weekDates.map((d) => daily[d]?.[key] ?? 0);

  // 부스 배치 - 결제까지 끝난 ASSIGNED만 배치로 셈. 종류는 부스 신청 화면과 같은 판별(isFoodBooth)을 씀
  const assignedOf = (list) => list.filter((b) => b.status === 'ASSIGNED').length;
  const reserved = booths.filter((b) => b.status === 'RESERVED').length;
  const foodBooths = booths.filter((b) => isFoodBooth(b.type));
  const mainBooths = booths.filter((b) => !isFoodBooth(b.type));

  const issued = tickets.freeIssued + tickets.paidIssued;

  // 시간대별 입장 - 기본 9~18시, 이 밖의 시간대에 체크인이 있으면 범위를 넓힘
  const counts = Object.fromEntries(hourly.map((h) => [h.hour, h.count]));
  const hours = hourly.map((h) => h.hour);
  const from = Math.min(9, ...hours);
  const to = Math.max(18, ...hours);
  const nowHour = new Date().getHours();
  const hourItems = Array.from({ length: to - from + 1 }, (_, i) => from + i).map((h) => ({
    label: `${h}시`,
    value: counts[h] ?? 0,
    active: h === nowHour,
  }));

  return (
    <>
      <section className="admin-applications__stats">
        <div className="admin-stat-card">
          <p>오늘 순매출</p>
          <strong>{won(todayStat.net)}</strong>
          <span className={`admin-dashboard__sub is-${netCompare.tone}`}>{netCompare.text}</span>
        </div>
        <div className="admin-stat-card">
          <p>오늘 입장 인원</p>
          <strong>{todayStat.visit}명</strong>
          <span className="admin-dashboard__sub">무료 {todayStat.free}명 | 유료 {todayStat.paid}명</span>
        </div>
        <div className="admin-stat-card">
          <p>오늘 취소표</p>
          <strong className="is-rejected">{todayStat.cancel}장</strong>
          <span className="admin-dashboard__sub">환불 금액 {won(todayStat.refund)}</span>
        </div>
        <div className="admin-stat-card">
          <p>심사 대기</p>
          <strong className="is-pending">{pending}건</strong>
          <span className="admin-dashboard__sub">전체 박람회 기준</span>
        </div>
      </section>

      <div className="admin-dashboard__grid admin-dashboard__grid--wide-right">
        <section className="admin-dashboard__card">
          <h3>입장권 유형별 입장 현황 (오늘)</h3>
          <div className="admin-dashboard__chart">
            <DonutChart
              centerLabel="총 입장 인원"
              items={[
                { label: '무료 입장권', value: todayStat.free, color: '#bfdbfe' },
                { label: '유료 입장권', value: todayStat.paid, color: '#2f6bff' },
              ]}
            />
          </div>
        </section>

        <section className="admin-dashboard__card">
          <h3>
            시간대별 입장 인원 (오늘)
            <Link to={`/admin/stats?expoId=${expoId}`}>상세 보기 &gt;</Link>
          </h3>
          <div className="admin-dashboard__chart">
            <BarChart items={hourItems} />
          </div>
        </section>
      </div>

      <div className="admin-dashboard__grid">
        <section className="admin-dashboard__card">
          <h3>최근 7일 입장 추이</h3>
          <div className="admin-dashboard__chart">
            <LineChart
              labels={weekDates.map(dayLabel)}
              series={[
                { name: '전체', color: '#2f6bff', values: weekValues('visit') },
                { name: '무료', color: '#93c5fd', values: weekValues('free') },
                { name: '유료', color: '#f97316', values: weekValues('paid') },
              ]}
            />
          </div>
        </section>

        <section className="admin-dashboard__card">
          <h3>최근 7일 매출 추이</h3>
          <div className="admin-dashboard__chart">
            <BarChart
              format={man}
              items={weekDates.map((d) => ({ label: dayLabel(d), value: daily[d]?.net ?? 0, active: d === today }))}
            />
          </div>
        </section>
      </div>

      <div className="admin-dashboard__grid admin-dashboard__grid--three">
        <section className="admin-dashboard__card">
          <h3>처리할 일</h3>
          {todos.length === 0 && <p className="admin-dashboard__empty">처리할 일이 없습니다.</p>}
          {todos.map((t) => (
            <div key={t.label} className="admin-dashboard__todo">
              <span className="admin-dashboard__todo-label">{t.label}</span>
              <span className={`admin-badge ${t.badge}`}>{t.count}{t.unit}</span>
              <Link to={t.to}>바로가기</Link>
            </div>
          ))}
        </section>

        <section className="admin-dashboard__card">
          <h3>부스 배치 현황</h3>
          <strong className="admin-dashboard__big">{ratio(assignedOf(booths), booths.length)}%</strong>
          <ProgressBar pct={ratio(assignedOf(booths), booths.length)} />
          <p className="admin-dashboard__sub">
            확정 {assignedOf(booths)}개, 결제 대기 {reserved}개, 전체 {booths.length}개
          </p>
          <p className="admin-dashboard__row"><span>조립 부스</span><span>{assignedOf(mainBooths)} / {mainBooths.length}</span></p>
          <p className="admin-dashboard__row"><span>푸드 부스</span><span>{assignedOf(foodBooths)} / {foodBooths.length}</span></p>
        </section>

        <section className="admin-dashboard__card">
          <h3>누적 입장권 현황</h3>
          <strong className="admin-dashboard__big">{ratio(tickets.used, issued)}%</strong>
          <ProgressBar pct={ratio(tickets.used, issued)} />
          <p className="admin-dashboard__sub">전체 기간 체크인 {tickets.used}명, 발급 {issued}장</p>
          <p className="admin-dashboard__row"><span>무료 QR 입장권</span><span>{tickets.freeIssued}장</span></p>
          <p className="admin-dashboard__row"><span>당일 유료 입장권</span><span>{tickets.paidIssued}장</span></p>
        </section>
      </div>

      <section className="admin-dashboard__card">
        <h3>
          최근 입장 현황 (오늘)
          <Link to={`/admin/stats?expoId=${expoId}`}>상세 보기 &gt;</Link>
        </h3>
        <CheckInLogList logs={logs} limit={5} />
      </section>
    </>
  );
}

export default AdminDashboard;
