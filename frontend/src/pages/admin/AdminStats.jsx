import { ChevronLeft, ChevronRight } from 'lucide-react';
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
import { AdminSidebarLayout } from '@/components/admin/AdminSidebarLayout';
import { EmptyState, PageHeader } from '@/components/layout/Page';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

// 전일 대비 증감 문구와 색(up, down)
const vsPrev = (cur, prev, unit) => {
  const diff = cur - prev;
  return {
    text: `전일 대비 ${diff >= 0 ? '+' : '-'}${Math.abs(diff).toLocaleString()}${unit}`,
    tone: diff === 0 ? '' : diff > 0 ? 'text-emerald-600' : 'text-red-600',
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
    <AdminSidebarLayout breadcrumb="통계">
      <PageHeader title="통계" description="박람회 입장, 매출, 방문자 등의 상세 통계를 확인할 수 있습니다." />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Select value={expoId} onValueChange={(v) => setParams({ expoId: v, month })}>
          <SelectTrigger className="h-10 w-full sm:w-72">
            <SelectValue placeholder="박람회 선택" />
          </SelectTrigger>
          <SelectContent>
            {expos.map((expo) => (
              <SelectItem key={expo.expoId} value={String(expo.expoId)}>{expo.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" size="icon" aria-label="이전 달" onClick={() => moveMonth(-1)}>
          <ChevronLeft />
        </Button>
        <span className="min-w-28 text-center text-sm font-semibold">{year}년 {mon}월</span>
        <Button type="button" variant="outline" size="icon" aria-label="다음 달" onClick={() => moveMonth(1)}>
          <ChevronRight />
        </Button>
        <Button type="button" variant="outline" onClick={() => setParams({ expoId, month: todayIso.slice(0, 7), date: todayIso })}>
          오늘
        </Button>
        <Link to="/admin/stats/payments" className="ml-auto text-sm text-primary">결제 내역 표로 보기</Link>
      </div>

      {loadError && <EmptyState tone="error" className="my-0">{loadError}</EmptyState>}

      <div className="flex flex-col gap-6">
        <Card>
          <CardContent>
            <h3 className="m-0 mb-3 text-sm font-semibold">일별 현황</h3>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map((w) => (
                <div key={w} className="py-1 text-center text-xs text-muted-foreground">{w}</div>
              ))}
              {buildCalendar(year, mon - 1).map((d, i) => {
                if (d === null) return <div key={`blank-${i}`} />;
                const iso = toIsoDate(year, mon - 1, d);
                const isSelected = iso === selected;
                const isToday = iso === todayIso;
                const isFuture = iso > todayIso;
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={isFuture}
                    onClick={() => setParams({ expoId, month, date: iso })}
                    className={cn(
                      'flex min-h-16 flex-col items-start gap-0.5 rounded-lg border border-border bg-background p-1.5 text-left text-xs text-muted-foreground',
                      !isFuture && 'cursor-pointer hover:border-muted-foreground/40',
                      isFuture && 'cursor-default text-muted-foreground/40',
                      isToday && 'border-primary',
                      isSelected && 'border-2 border-primary bg-primary/5'
                    )}
                  >
                    <b className={cn('text-xs text-foreground', isFuture && 'text-muted-foreground/40')}>{d}</b>
                    <span className="text-xs font-semibold text-foreground">입장: {(daily[iso] ?? EMPTY_DAY).visit}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2.5 text-xs text-muted-foreground">셀의 숫자는 그날 입장(체크인) 인원입니다.</p>
          </CardContent>
        </Card>

        {selected && (
          <>
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <Card>
                <CardContent>
                  <p className="m-0 text-xs text-muted-foreground">총 입장 인원</p>
                  <strong className="mt-1 block text-2xl font-extrabold">{stat.visit.toLocaleString()}명</strong>
                  <span className={cn('text-xs', visitCompare.tone)}>{visitCompare.text}</span>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <p className="m-0 text-xs text-muted-foreground">무료 입장권</p>
                  <strong className="mt-1 block text-2xl font-extrabold">{stat.free.toLocaleString()}명</strong>
                  <span className="text-xs text-muted-foreground">{ratio(stat.free, stat.visit)}%</span>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <p className="m-0 text-xs text-muted-foreground">유료 입장권</p>
                  <strong className="mt-1 block text-2xl font-extrabold">{stat.paid.toLocaleString()}명</strong>
                  <span className="text-xs text-muted-foreground">{ratio(stat.paid, stat.visit)}%</span>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <p className="m-0 text-xs text-muted-foreground">취소표</p>
                  <strong className="mt-1 block text-2xl font-extrabold text-red-600">{stat.cancel}장</strong>
                  <span className="text-xs text-muted-foreground">환불 금액 {won(stat.refund)}</span>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <p className="m-0 text-xs text-muted-foreground">해당일 순매출</p>
                  <strong className="mt-1 block text-2xl font-extrabold">{won(stat.net)}</strong>
                  <span className={cn('text-xs', netCompare.tone)}>{netCompare.text}</span>
                </CardContent>
              </Card>
            </section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_2fr]">
              <Card>
                <CardContent>
                  <h3 className="m-0 mb-3 text-sm font-semibold">입장권 유형별 비율</h3>
                  <div className="flex min-h-40 flex-col justify-center">
                    <DonutChart
                      centerLabel="총 입장 인원"
                      items={[
                        { label: '무료 입장권', value: stat.free, color: '#bfdbfe' },
                        { label: '유료 입장권', value: stat.paid, color: '#2f6bff' },
                      ]}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <h3 className="m-0 mb-3 flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
                    시간대별 입장 인원 ({selected})
                    <span className="inline-flex gap-1">
                      {HOUR_MODES.map((m) => (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => setHourMode(m.key)}
                          className={cn(
                            'rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground',
                            hourMode === m.key && 'border-primary bg-primary/10 text-primary'
                          )}
                        >
                          {m.label}
                        </button>
                      ))}
                    </span>
                  </h3>
                  <div className="flex min-h-40 flex-col justify-center">
                    <BarChart items={hourItems} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card>
                <CardContent>
                  <h3 className="m-0 mb-3 text-sm font-semibold">입장권 상세</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>구분</TableHead>
                        <TableHead>입장</TableHead>
                        <TableHead>비율</TableHead>
                        <TableHead>매출액</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>무료</TableCell>
                        <TableCell>{stat.free}명</TableCell>
                        <TableCell>{ratio(stat.free, stat.visit)}%</TableCell>
                        <TableCell>0원</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>유료</TableCell>
                        <TableCell>{stat.paid}명</TableCell>
                        <TableCell>{ratio(stat.paid, stat.visit)}%</TableCell>
                        <TableCell>{won(ticketRevenue)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-semibold">합계</TableCell>
                        <TableCell className="font-semibold">{stat.visit}명</TableCell>
                        <TableCell className="font-semibold">{stat.visit === 0 ? 0 : 100}%</TableCell>
                        <TableCell className="font-semibold">{won(ticketRevenue)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  <p className="mt-2.5 text-xs text-muted-foreground">
                    입장 인원은 체크인 수, 매출액은 그날 결제된 당일 입장권 금액입니다.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <h3 className="m-0 mb-3 text-sm font-semibold">입장 현황 ({selected})</h3>
                  <CheckInLogList logs={logs} />
                  <p className="mt-2.5 text-xs text-muted-foreground">최근 입장 20건까지 노출됩니다.</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <h3 className="m-0 mb-3 text-sm font-semibold">취소표 내역 ({selected})</h3>
                  <RefundLogList logs={refundLogs} />
                  <p className="mt-2.5 text-xs text-muted-foreground">최근 환불 20건까지 노출됩니다.</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AdminSidebarLayout>
  );
}

export default AdminStats;
