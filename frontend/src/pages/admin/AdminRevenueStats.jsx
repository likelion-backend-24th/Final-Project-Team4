import { useEffect, useState } from 'react';
import { getAdminExpoList } from '../../api/expo';
import { getExpoRevenue, getPaymentStats } from '../../api/payment';
import { offsetIsoDate } from '../../utils/calendar';
import { SOURCE_LABEL } from '../../utils/statsFormat';
import './AdminApplications.css';
import './AdminRevenueStats.css';

function AdminRevenueStats() {
  const [expos, setExpos] = useState([]);
  const [expoId, setExpoId] = useState('');
  const [from, setFrom] = useState(offsetIsoDate(-29));
  const [to, setTo] = useState(offsetIsoDate(0));
  const [revenue, setRevenue] = useState(null);
  const [statsEntries, setStatsEntries] = useState([]);
  const [loadError, setLoadError] = useState(null);

  // 박람회 선택용 목록 - 심사 화면과 동일한 관리자 박람회 목록 API 재사용
  useEffect(() => {
    getAdminExpoList({ size: 1000 })
      .then((res) => {
        const list = res.content ?? [];
        setExpos(list);
        if (list.length > 0) setExpoId(String(list[0].expoId));
      })
      .catch((err) => setLoadError(err.response?.data?.error?.message ?? '박람회 목록을 불러오지 못했습니다.'));
  }, []);

  useEffect(() => {
    if (!expoId) return;
    setLoadError(null);
    Promise.all([getExpoRevenue(expoId), getPaymentStats({ expoId, from, to })])
      .then(([revenueRes, statsRes]) => {
        setRevenue(revenueRes);
        setStatsEntries(statsRes);
      })
      .catch((err) => setLoadError(err.response?.data?.error?.message ?? '통계를 불러오지 못했습니다.'));
  }, [expoId, from, to]);

  return (
    <div className="admin-applications">
      <section className="admin-applications__hero">
        <p className="admin-applications__eyebrow">EXHIBITOR MANAGEMENT PORTAL</p>
        <h1>결제 통계</h1>
        <p>박람회별 매출 현황과 일별 결제·환불 통계를 확인합니다.</p>
      </section>

      <section className="admin-revenue-stats__filters">
        <select value={expoId} onChange={(e) => setExpoId(e.target.value)}>
          {expos.map((expo) => (
            <option key={expo.expoId} value={expo.expoId}>{expo.title}</option>
          ))}
        </select>
        <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        <span>~</span>
        <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
      </section>

      {loadError && <p className="admin-applications__error">{loadError}</p>}

      {revenue && (
        <section className="admin-applications__stats">
          <div className="admin-stat-card">
            <p>부스 참가비 매출</p>
            <strong>{revenue.boothFee.toLocaleString()}원</strong>
          </div>
          <div className="admin-stat-card">
            <p>당일 입장권 매출</p>
            <strong>{revenue.dayTicket.toLocaleString()}원</strong>
          </div>
          <div className="admin-stat-card">
            <p>환불 총액</p>
            <strong className="is-rejected">{revenue.refundTotal.toLocaleString()}원</strong>
          </div>
          <div className="admin-stat-card">
            <p>순매출</p>
            <strong className="is-approved">{revenue.netRevenue.toLocaleString()}원</strong>
          </div>
        </section>
      )}

      <div className="admin-applications__table-card">
        <table className="admin-applications__table">
          <thead>
            <tr>
              <th>날짜</th>
              <th>구분</th>
              <th>결제 건수</th>
              <th>결제 금액</th>
              <th>환불 건수</th>
              <th>환불 금액</th>
              <th>순매출</th>
            </tr>
          </thead>
          <tbody>
            {statsEntries.length === 0 && (
              <tr><td colSpan={7} style={{ color: '#64748b' }}>선택한 기간에 결제·환불 내역이 없습니다.</td></tr>
            )}
            {statsEntries.map((entry) => (
              <tr key={`${entry.date}-${entry.source}`}>
                <td>{entry.date}</td>
                <td>
                  <span className={`admin-badge ${entry.source === 'BOOTH_FEE' ? 'admin-badge--reserved' : 'admin-badge--approved'}`}>
                    {SOURCE_LABEL[entry.source] ?? entry.source}
                  </span>
                </td>
                <td>{entry.paidCount}</td>
                <td>{entry.paidAmount.toLocaleString()}원</td>
                <td>{entry.refundCount}</td>
                <td>{entry.refundAmount.toLocaleString()}원</td>
                <td className="is-strong">{entry.net.toLocaleString()}원</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminRevenueStats;
