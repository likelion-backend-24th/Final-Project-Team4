const TICKET_LABEL = { FREE: '무료 입장', PAID: '유료 입장' };

// 입장(체크인) 내역 표. logs: [{ checkedInAt, customerName, ticketType }]
// 입장 방법은 지금 고객 셀프 QR 체크인 한 가지뿐이라 고정값으로 보여줌
function CheckInLogList({ logs, limit = 20 }) {
  const rows = logs.slice(0, limit);

  return (
    <table className="admin-applications__table">
      <thead>
        <tr>
          <th>시간</th>
          <th>이름</th>
          <th>입장권 유형</th>
          <th>입장 방법</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr><td colSpan={4} style={{ color: '#64748b' }}>입장 기록이 없습니다.</td></tr>
        )}
        {rows.map((r, i) => (
          <tr key={i}>
            <td>{r.checkedInAt.slice(11, 16)}</td>
            <td>{r.customerName}</td>
            <td>
              <span className={`admin-badge ${r.ticketType === 'PAID' ? 'admin-badge--approved' : 'admin-badge--reserved'}`}>
                {TICKET_LABEL[r.ticketType] ?? r.ticketType}
              </span>
            </td>
            <td>QR 체크인</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default CheckInLogList;
