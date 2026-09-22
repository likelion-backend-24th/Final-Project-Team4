import { won } from '../utils/statsFormat';

// 취소표(환불) 내역 표. logs: [{ refundedAt, amount, refundReason }]
function RefundLogList({ logs, limit = 20 }) {
  const rows = logs.slice(0, limit);

  return (
    <table className="admin-applications__table">
      <thead>
        <tr>
          <th>시간</th>
          <th>환불 금액</th>
          <th>사유</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr><td colSpan={3} style={{ color: '#64748b' }}>취소표 내역이 없습니다.</td></tr>
        )}
        {rows.map((r, i) => (
          <tr key={i}>
            <td>{r.refundedAt.slice(11, 16)}</td>
            <td className="is-rejected">{won(r.amount)}</td>
            <td style={{ whiteSpace: 'normal' }}>{r.refundReason || '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default RefundLogList;
