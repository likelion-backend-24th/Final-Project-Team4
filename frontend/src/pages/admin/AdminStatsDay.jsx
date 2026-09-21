import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getPaymentStats } from '../../api/payment';
import { getCheckInStats } from '../../api/reservation';
import BarChart from '../../components/BarChart';
import { shiftIsoDate } from '../../utils/calendar';
import { EMPTY_DAY, SOURCE_LABEL, man, mergeDaily, won } from '../../utils/statsFormat';
import './AdminApplications.css';
import './AdminDashboard.css';
import './AdminStats.css';

// 날짜 상세 - 그날 요약, 최근 7일 추이 그래프, 유형별 결제/환불 내역
function AdminStatsDay() {
  const { date } = useParams();
  const [params] = useSearchParams();
  const expoId = params.get('expoId');
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const from = shiftIsoDate(date, -6);
    Promise.all([getPaymentStats({ expoId, from, to: date }), getCheckInStats({ expoId, from, to: date })])
      .then(([payments, checkIns]) => {
        setData({ payments, daily: mergeDaily(payments, checkIns) });
        setLoadError(null);
      })
      .catch((err) => setLoadError(err.response?.data?.error?.message ?? '통계를 불러오지 못했습니다.'));
  }, [expoId, date]);

  const weekDates = Array.from({ length: 7 }, (_, i) => shiftIsoDate(date, i - 6));
  const chartItems = (key) =>
    weekDates.map((d) => ({ label: `${Number(d.slice(8))}일`, value: data.daily[d]?.[key] ?? 0, active: d === date }));
  const stat = data?.daily[date] ?? EMPTY_DAY;
  const rows = data?.payments.filter((p) => p.date === date) ?? [];

  return (
    <div className="admin-applications">
      <section className="admin-applications__hero">
        <p className="admin-applications__eyebrow">EXHIBITOR MANAGEMENT PORTAL</p>
        <h1>{date} 상세</h1>
        <p>선택한 날짜의 매출, 방문자, 취소표와 최근 7일 추이를 확인합니다.</p>
      </section>

      <Link to={`/admin/stats?expoId=${expoId}&month=${date.slice(0, 7)}`} className="admin-stats__back">
        &lt; 달력으로
      </Link>

      {loadError && <p className="admin-applications__error">{loadError}</p>}

      {data && (
        <>
          <section className="admin-applications__stats">
            <div className="admin-stat-card">
              <p>순매출</p>
              <strong>{won(stat.net)}</strong>
            </div>
            <div className="admin-stat-card">
              <p>방문자 (체크인)</p>
              <strong>{stat.visit.toLocaleString()}명</strong>
            </div>
            <div className="admin-stat-card">
              <p>취소표</p>
              <strong className="is-rejected">{stat.cancel}장</strong>
            </div>
            <div className="admin-stat-card">
              <p>환불액 (입장권)</p>
              <strong>{won(stat.refund)}</strong>
            </div>
          </section>

          <section className="admin-dashboard__card">
            <h3>최근 7일 순매출</h3>
            <BarChart items={chartItems('net')} format={man} />
          </section>

          <section className="admin-dashboard__card">
            <h3>최근 7일 방문자</h3>
            <BarChart items={chartItems('visit')} />
          </section>

          <div className="admin-applications__table-card">
            <table className="admin-applications__table">
              <thead>
                <tr>
                  <th>구분</th>
                  <th>결제 건수</th>
                  <th>결제 금액</th>
                  <th>환불 건수</th>
                  <th>환불 금액</th>
                  <th>순매출</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={6} style={{ color: '#64748b' }}>이 날짜에 결제, 환불 내역이 없습니다.</td></tr>
                )}
                {rows.map((r) => (
                  <tr key={r.source}>
                    <td>{SOURCE_LABEL[r.source] ?? r.source}</td>
                    <td>{r.paidCount}</td>
                    <td>{won(r.paidAmount)}</td>
                    <td>{r.refundCount}</td>
                    <td>{won(r.refundAmount)}</td>
                    <td className="is-strong">{won(r.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminStatsDay;
