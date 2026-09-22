// 관리자 대시보드, 통계 화면 공용 계산, 표시 유틸.

export const SOURCE_LABEL = { BOOTH_FEE: '부스 참가비', DAY_TICKET: '당일 입장권' };

export const sum = (rows, key) => rows.reduce((acc, r) => acc + r[key], 0);

export const won = (n) => `${n.toLocaleString()}원`;

// 비중(%) - 분모가 0이면 0
export const ratio = (part, total) => (total === 0 ? 0 : Math.round((part / total) * 100));

// 1만 이상은 '150만'처럼 줄여서 표시 (달력 셀, 그래프 값처럼 좁은 곳용)
export const man = (n) => (n >= 10000 ? `${Math.round(n / 10000).toLocaleString()}만` : String(n));

// '2026-09-16' -> '9/16(수)'. 그래프 x축용
export const dayLabel = (iso) =>
  `${Number(iso.slice(5, 7))}/${Number(iso.slice(8))}(${'일월화수목금토'[new Date(`${iso}T00:00:00`).getDay()]})`;

export const EMPTY_DAY = { net: 0, payCount: 0, cancel: 0, refund: 0, visit: 0, free: 0, paid: 0 };

// 결제 통계(source별 행)와 일별 체크인 수를 날짜 기준 한 객체로 합침.
// { 'YYYY-MM-DD': { net, payCount, cancel, refund, visit, free, paid } }
// 취소표는 당일 입장권 환불 건수, refund는 그 환불 금액, visit은 체크인 수(free, paid는 무료, 유료 입장권 체크인 수)
export function mergeDaily(payments, checkIns) {
  const days = {};
  const of = (date) => (days[date] ??= { ...EMPTY_DAY });
  payments.forEach((p) => {
    const d = of(p.date);
    d.net += p.net;
    d.payCount += p.paidCount;
    if (p.source === 'DAY_TICKET') {
      d.cancel += p.refundCount;
      d.refund += p.refundAmount;
    }
  });
  checkIns.forEach((c) => {
    const d = of(c.date);
    d.visit = c.count;
    d.free = c.free;
    d.paid = c.paid;
  });
  return days;
}
