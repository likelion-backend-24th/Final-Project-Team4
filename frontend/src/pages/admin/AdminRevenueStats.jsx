import { useEffect, useState } from 'react';
import { getAdminExpoList } from '../../api/expo';
import { getExpoRevenue, getPaymentStats } from '../../api/payment';
import { toIsoDate } from '../../utils/calendar';
import { AdminSidebarLayout } from '@/components/admin/AdminSidebarLayout';
import { EmptyState, PageHeader } from '@/components/layout/Page';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

const SOURCE_LABEL = { BOOTH_FEE: '부스 참가비', DAY_TICKET: '당일 입장권' };

function defaultDate(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return toIsoDate(d.getFullYear(), d.getMonth(), d.getDate());
}

function AdminRevenueStats() {
  const [expos, setExpos] = useState([]);
  const [expoId, setExpoId] = useState('');
  const [from, setFrom] = useState(defaultDate(-29));
  const [to, setTo] = useState(defaultDate(0));
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

  const cards = revenue && [
    ['부스 참가비 매출', revenue.boothFee, ''],
    ['당일 입장권 매출', revenue.dayTicket, ''],
    ['환불 총액', revenue.refundTotal, 'text-red-600'],
    ['순매출', revenue.netRevenue, 'text-emerald-600'],
  ];

  return (
    <AdminSidebarLayout breadcrumb="통계">
      <PageHeader title="결제 통계" description="박람회별 매출 현황과 일별 결제·환불 통계를 확인합니다." />

      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={expoId} onValueChange={setExpoId}>
            <SelectTrigger className="h-10 w-full sm:w-72">
              <SelectValue placeholder="박람회 선택" />
            </SelectTrigger>
            <SelectContent>
              {expos.map((expo) => (
                <SelectItem key={expo.expoId} value={String(expo.expoId)}>{expo.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" className="h-10 w-auto" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          <span className="text-muted-foreground">~</span>
          <Input type="date" className="h-10 w-auto" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </div>

        {loadError && <EmptyState tone="error" className="my-0">{loadError}</EmptyState>}

        {cards && (
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cards.map(([label, value, tone]) => (
              <Card key={label}>
                <CardContent>
                  <p className="m-0 text-xs text-muted-foreground">{label}</p>
                  <strong className={cn('mt-1 block text-2xl font-extrabold', tone)}>{value.toLocaleString()}원</strong>
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        <Card className="py-0">
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">날짜</TableHead>
                  <TableHead>구분</TableHead>
                  <TableHead>결제 건수</TableHead>
                  <TableHead>결제 금액</TableHead>
                  <TableHead>환불 건수</TableHead>
                  <TableHead>환불 금액</TableHead>
                  <TableHead className="pr-5">순매출</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statsEntries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      선택한 기간에 결제·환불 내역이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
                {statsEntries.map((entry) => (
                  <TableRow key={`${entry.date}-${entry.source}`}>
                    <TableCell className="pl-5">{entry.date}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={entry.source === 'BOOTH_FEE' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}>
                        {SOURCE_LABEL[entry.source] ?? entry.source}
                      </Badge>
                    </TableCell>
                    <TableCell>{entry.paidCount}</TableCell>
                    <TableCell>{entry.paidAmount.toLocaleString()}원</TableCell>
                    <TableCell>{entry.refundCount}</TableCell>
                    <TableCell>{entry.refundAmount.toLocaleString()}원</TableCell>
                    <TableCell className="pr-5 font-semibold">{entry.net.toLocaleString()}원</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminSidebarLayout>
  );
}

export default AdminRevenueStats;
