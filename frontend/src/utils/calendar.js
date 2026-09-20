// 상담 신청 화면들(VehicleDetail, BulkConsultationModal)의 월간 달력 그리드 계산 공용 유틸.
export function buildCalendar(year, month) {
  // month: 0-indexed
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
  return cells;
}

// (year, month, day) → 'YYYY-MM-DD' (month은 0-indexed)
export function toIsoDate(year, month, day) {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

// 박람회 기간(startsAt~endsAt ISO 문자열)의 날짜 목록 'YYYY-MM-DD'. UTC 기준으로만 계산해서 타임존에 따라 하루 밀리지 않는다.
export function expoDateRange(expo) {
  const [sy, sm, sd] = expo.startsAt.slice(0, 10).split('-').map(Number);
  const [ey, em, ed] = expo.endsAt.slice(0, 10).split('-').map(Number);
  const cur = new Date(Date.UTC(sy, sm - 1, sd));
  const end = new Date(Date.UTC(ey, em - 1, ed));
  const dates = [];
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

export const WEEKDAYS =['일', '월', '화', '수', '목', '금', '토'];
