import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

// 관리자 회원 관리 화면 상단 통계 카드. AdminAttendeeList.jsx, AdminExhibitorList.jsx 사용
export function StatCard({ icon: Icon, tone, label, value, sub }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', tone)}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="m-0 text-xs text-muted-foreground">{label}</p>
          <strong className="mt-0.5 block text-2xl font-extrabold">{value}</strong>
          {sub && <p className="m-0 mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
