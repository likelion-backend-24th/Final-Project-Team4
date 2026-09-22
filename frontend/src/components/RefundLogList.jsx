import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { won } from '../utils/statsFormat';

// 취소표(환불) 내역 표. logs: [{ refundedAt, amount, refundReason }]
function RefundLogList({ logs, limit = 20 }) {
  const rows = logs.slice(0, limit);

  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead className="w-1/3 text-center">시간</TableHead>
          <TableHead className="w-1/3 text-center">환불 금액</TableHead>
          <TableHead className="w-1/3 text-center">사유</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && (
          <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">취소표 내역이 없습니다.</TableCell></TableRow>
        )}
        {rows.map((r, i) => (
          <TableRow key={i}>
            <TableCell className="text-center">{r.refundedAt.slice(11, 16)}</TableCell>
            <TableCell className="text-center text-red-600">{won(r.amount)}</TableCell>
            <TableCell className="text-center whitespace-normal">{r.refundReason || '-'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default RefundLogList;
