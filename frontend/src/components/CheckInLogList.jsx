import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const TICKET_LABEL = { FREE: '무료 입장', PAID: '유료 입장' };

// 입장(체크인) 내역 표. logs: [{ checkedInAt, customerName, ticketType }]
// 입장 방법은 지금 고객 셀프 QR 체크인 한 가지뿐이라 고정값으로 보여줌
function CheckInLogList({ logs, limit = 20 }) {
  const rows = logs.slice(0, limit);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>시간</TableHead>
          <TableHead>이름</TableHead>
          <TableHead>입장권 유형</TableHead>
          <TableHead>입장 방법</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && (
          <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">입장 기록이 없습니다.</TableCell></TableRow>
        )}
        {rows.map((r, i) => (
          <TableRow key={i}>
            <TableCell>{r.checkedInAt.slice(11, 16)}</TableCell>
            <TableCell>{r.customerName}</TableCell>
            <TableCell>
              <Badge variant="secondary" className={r.ticketType === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}>
                {TICKET_LABEL[r.ticketType] ?? r.ticketType}
              </Badge>
            </TableCell>
            <TableCell>QR 체크인</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default CheckInLogList;
