// 관리자 회원 관리(참관객/참가업체) 목록 화면 공용 상수·헬퍼.
// AdminAttendeeList.jsx, AdminExhibitorList.jsx 사용

export const STATUS_LABEL = { ACTIVE: '활성', LOCKED: '정지', WITHDRAWN: '탈퇴' };
export const STATUS_TONE = {
  활성: 'bg-emerald-100 text-emerald-700',
  정지: 'bg-red-100 text-red-700',
  탈퇴: 'bg-slate-100 text-slate-600',
};

export const ALL = '__all__';
export const PERIOD_OPTIONS = [
  { value: ALL, label: '전체 기간' },
  { value: '0', label: '오늘 가입' },
  { value: '7', label: '최근 7일' },
  { value: '30', label: '최근 30일' },
];
export const PAGE_SIZE_OPTIONS = [10, 20, 50];

// ISO(2026-01-20T10:14:00) → 2026.01.20
export const fmtDate = (iso) => (iso ? iso.slice(0, 10).replace(/-/g, '.') : '-');
// ISO → 2026.01.20 10:14
export const fmtDateTime = (iso) => (iso ? iso.slice(0, 16).replace('T', ' ').replace(/-/g, '.') : '-');

export const toDateParam = (date) => date.toISOString().slice(0, 10);

// "최근 N일" 선택값 → 백엔드 signupFrom/signupTo(둘 다 date, 자정 기준) 변환. 전체 기간이면 undefined.
export function periodToRange(period) {
  if (period === ALL) return { signupFrom: undefined, signupTo: undefined };
  const days = Number(period);
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - days);
  return { signupFrom: toDateParam(from), signupTo: toDateParam(today) };
}

export function percent(count, total) {
  if (!total) return '0%';
  return `${((count / total) * 100).toFixed(1)}%`;
}
