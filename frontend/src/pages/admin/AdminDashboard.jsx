import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminExpoBooths, getAdminExpoList } from '../../api/expo';
import { getPaymentStats } from '../../api/payment';
import { getCheckInLogs, getCheckInStats, getHourlyCheckIns, getTicketStats } from '../../api/reservation';
import BarChart from '../../components/BarChart';
import CheckInLogList from '../../components/admin/CheckInLogList';
import DonutChart from '../../components/DonutChart';
import LineChart from '../../components/LineChart';
import { isFoodBooth } from '../../utils/boothType';
import { offsetIsoDate } from '../../utils/calendar';
import { EMPTY_DAY, dayLabel, man, mergeDaily, ratio, sum, won } from '../../utils/statsFormat';
import { AdminSidebarLayout } from '@/components/admin/AdminSidebarLayout';
import { EmptyState, PageHeader } from '@/components/layout/Page';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

// 전일 대비 문구와 색(up, down). 어제 값이 0이면 퍼센트는 빼고 차이만 보여줌
const compare = (cur, prev, fmt) => {
  const diff = cur - prev;
  if (diff === 0) return { text: '어제와 같음', tone: '' };
  const pct = prev === 0 ? '' : `${diff > 0 ? '+' : '-'}${Math.abs(Math.round((diff / prev) * 100))}% `;
  return {
    text: `${diff > 0 ? '▲' : '▼'} ${pct}어제보다 ${fmt(Math.abs(diff))} ${diff > 0 ? '증가' : '감소'}`,
    tone: diff > 0 ? 'text-emerald-600' : 'text-red-600',
  };
};

function ProgressBar({ pct }) {
  return (
    <div className="my-2 h-2.5 overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
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
    { label: '부스 신청 심사 대기', count: pending, unit: '건', tone: 'bg-amber-100 text-amber-700', to: '/admin/applications' },
    { label: '결제 대기 중인 신청', count: sum(expos, 'paymentPendingCount'), unit: '건', tone: 'bg-blue-100 text-blue-700', to: '/admin/applications' },
    { label: '공개 전환이 안 된 박람회', count: expos.filter((e) => e.status === 'DRAFT').length, unit: '개', tone: 'bg-blue-100 text-blue-700', to: '/admin/applications' },
  ].filter((t) => t.count > 0);

  return (
    <AdminSidebarLayout breadcrumb="대시보드">
      <PageHeader title="관리자 대시보드" description="박람회의 전반적인 현황을 한눈에 확인합니다." />

      <div className="mb-6">
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
      </div>

      {loadError && <EmptyState tone="error" className="my-0">{loadError}</EmptyState>}

      {data && <DashboardBody data={data} pending={pending} todos={todos} />}
    </AdminSidebarLayout>
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
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent>
            <p className="m-0 text-xs text-muted-foreground">오늘 순매출</p>
            <strong className="mt-1 block text-2xl font-extrabold">{won(todayStat.net)}</strong>
            <span className={cn('text-xs', netCompare.tone)}>{netCompare.text}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="m-0 text-xs text-muted-foreground">오늘 입장 인원</p>
            <strong className="mt-1 block text-2xl font-extrabold">{todayStat.visit}명</strong>
            <span className="text-xs text-muted-foreground">무료 {todayStat.free}명 | 유료 {todayStat.paid}명</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="m-0 text-xs text-muted-foreground">오늘 취소표</p>
            <strong className="mt-1 block text-2xl font-extrabold text-red-600">{todayStat.cancel}장</strong>
            <span className="text-xs text-muted-foreground">환불 금액 {won(todayStat.refund)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="m-0 text-xs text-muted-foreground">심사 대기</p>
            <strong className="mt-1 block text-2xl font-extrabold text-amber-600">{pending}건</strong>
            <span className="text-xs text-muted-foreground">전체 박람회 기준</span>
          </CardContent>
        </Card>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_2fr]">
        <Card>
          <CardContent>
            <h3 className="m-0 mb-3 text-sm font-semibold">입장권 유형별 입장 현황 (오늘)</h3>
            <div className="flex min-h-40 flex-col justify-center">
              <DonutChart
                centerLabel="총 입장 인원"
                items={[
                  { label: '무료 입장권', value: todayStat.free, color: '#bfdbfe' },
                  { label: '유료 입장권', value: todayStat.paid, color: '#2f6bff' },
                ]}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="m-0 mb-3 flex items-center justify-between text-sm font-semibold">
              시간대별 입장 인원 (오늘)
              <Link to={`/admin/stats?expoId=${expoId}`} className="text-xs font-normal text-primary">상세 보기 &gt;</Link>
            </h3>
            <div className="flex min-h-40 flex-col justify-center">
              <BarChart items={hourItems} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardContent>
            <h3 className="m-0 mb-3 text-sm font-semibold">최근 7일 입장 추이</h3>
            <LineChart
              labels={weekDates.map(dayLabel)}
              series={[
                { name: '전체', color: '#2f6bff', values: weekValues('visit') },
                { name: '무료', color: '#93c5fd', values: weekValues('free') },
                { name: '유료', color: '#f97316', values: weekValues('paid') },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="m-0 mb-3 text-sm font-semibold">최근 7일 매출 추이</h3>
            <BarChart
              format={man}
              items={weekDates.map((d) => ({ label: dayLabel(d), value: daily[d]?.net ?? 0, active: d === today }))}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardContent>
            <h3 className="m-0 mb-1 text-sm font-semibold">처리할 일</h3>
            {todos.length === 0 && <p className="text-sm text-muted-foreground">처리할 일이 없습니다.</p>}
            {todos.map((t) => (
              <div key={t.label} className="flex items-center gap-3 border-t border-border py-2.5 text-sm first:border-t-0">
                <span className="flex-1">{t.label}</span>
                <Badge variant="secondary" className={t.tone}>{t.count}{t.unit}</Badge>
                <Link to={t.to} className="text-xs text-primary">바로가기</Link>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="m-0 mb-1 text-sm font-semibold">부스 배치 현황</h3>
            <strong className="text-2xl font-extrabold">{ratio(assignedOf(booths), booths.length)}%</strong>
            <ProgressBar pct={ratio(assignedOf(booths), booths.length)} />
            <p className="m-0 text-xs text-muted-foreground">
              확정 {assignedOf(booths)}개, 결제 대기 {reserved}개, 전체 {booths.length}개
            </p>
            <p className="mt-2 flex justify-between border-t border-border pt-2 text-xs"><span>조립 부스</span><span>{assignedOf(mainBooths)} / {mainBooths.length}</span></p>
            <p className="mt-2 flex justify-between border-t border-border pt-2 text-xs"><span>푸드 부스</span><span>{assignedOf(foodBooths)} / {foodBooths.length}</span></p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="m-0 mb-1 text-sm font-semibold">누적 입장권 현황</h3>
            <strong className="text-2xl font-extrabold">{ratio(tickets.used, issued)}%</strong>
            <ProgressBar pct={ratio(tickets.used, issued)} />
            <p className="m-0 text-xs text-muted-foreground">전체 기간 체크인 {tickets.used}명, 발급 {issued}장</p>
            <p className="mt-2 flex justify-between border-t border-border pt-2 text-xs"><span>무료 QR 입장권</span><span>{tickets.freeIssued}장</span></p>
            <p className="mt-2 flex justify-between border-t border-border pt-2 text-xs"><span>당일 유료 입장권</span><span>{tickets.paidIssued}장</span></p>
          </CardContent>
        </Card>
      </div>

      <Card className="py-0">
        <CardContent className="overflow-x-auto p-0 pt-4">
          <h3 className="m-0 mb-3 flex items-center justify-between px-5 text-sm font-semibold">
            최근 입장 현황 (오늘)
            <Link to={`/admin/stats?expoId=${expoId}`} className="text-xs font-normal text-primary">상세 보기 &gt;</Link>
          </h3>
          <CheckInLogList logs={logs} limit={5} />
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminDashboard;
