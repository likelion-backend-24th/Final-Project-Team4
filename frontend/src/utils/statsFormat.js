// 관리자 대시보드, 통계 화면 공용 계산, 표시 유틸.

export const SOURCE_LABEL = { BOOTH_FEE: '부스 참가비', DAY_TICKET: '당일 입장권' };

export const sum = (rows, key) => rows.reduce((acc, r) => acc + r[key], 0);

export const won = (n) => `${n.toLocaleString()}원`;

// 1만 이상은 '150만'처럼 줄여서 표시 (달력 셀, 그래프 값처럼 좁은 곳용)
export const man = (n) => (n >= 10000 ? `${Math.round(n / 10000).toLocaleString()}만` : String(n));

export const EMPTY_DAY = { net: 0, payCount: 0, cancel: 0, refund: 0, visit: 0 };

// 결제 통계(source별 행)와 일별 체크인 수를 날짜 기준 한 객체로 합침. { 'YYYY-MM-DD': { net, payCount, cancel, refund, visit } }
// 취소표는 당일 입장권 환불 건수, refund는 그 환불 금액
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
    of(c.date).visit = c.count;
  });
  return days;
}
