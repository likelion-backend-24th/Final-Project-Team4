// 일반 사용자(방문객)용 화면 목업 데이터.
export const mockCustomerExpos = [
  {
    expoId: 1,
    title: '2026 서울 모빌리티 엑스포',
    venue: 'COEX 서울 코엑스 A, B',
    startsAt: '2026-09-11',
    endsAt: '2026-09-13',
    phase: '모집중',
    boothCount: 128,
  },
  {
    expoId: 2,
    title: '2026 부산 국제 자동차 박람회',
    venue: 'BEXCO 부산 벡스코',
    startsAt: '2026-09-11',
    endsAt: '2026-09-13',
    phase: '모집중',
    boothCount: 34,
  },
  {
    expoId: 3,
    title: '2026 대한민근 모빌리티 전장·SW 페어',
    venue: 'KINTEX 일산 킨텍스',
    startsAt: '2026-09-30',
    endsAt: '2026-10-04',
    phase: '모집예정',
    boothCount: 0,
  },
  {
    expoId: 4,
    title: '2026 인천 스마트 모빌리티 위크',
    venue: '송도컨벤시아 인천',
    startsAt: '2026-09-08',
    endsAt: '2026-09-30',
    phase: '진행중',
    boothCount: 52,
  },
];

export const CUSTOMER_EXPO_GRADIENTS = [
  'linear-gradient(135deg, #1e293b, #0f172a)',
  'linear-gradient(135deg, #7f1d1d, #1f2937)',
  'linear-gradient(135deg, #0e7490, #0f172a)',
];

export const CONSULTATION_TIME_SLOTS = [
  '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00',
];

// 환불 신청 모달의 환불 사유 드롭다운 옵션. 값은 그대로 백엔드에 문자열로 저장됨(별도 enum 없음) —
// ConsultationReject 등 기존 "사유" 필드들과 동일하게 자유 문자열로 취급.
export const REFUND_REASONS = [
  { value: '단순 변심', label: '단순 변심' },
  { value: '일정 변경', label: '일정 변경' },
  { value: '중복 결제', label: '중복 결제' },
  { value: '기타', label: '기타' },
];

export function findMockExpo(expoId) {
  return mockCustomerExpos.find((e) => e.expoId === expoId) ?? null;
}

export function toDisplayTicket(apiTicket, expoMap, holderName) {
  const expo = expoMap?.get(apiTicket.expoId) ?? null;
  return {
    id: `ticket-${apiTicket.ticketId}`,
    ticketId: apiTicket.ticketId,
    expoId: apiTicket.expoId,
    expoTitle: expo?.title ?? `박람회 #${apiTicket.expoId}`,
    startsAt: expo?.startsAt ?? null,
    endsAt: expo?.endsAt ?? null,
    venue: expo?.venue ?? '-',
    visitDate: apiTicket.visitDate,
    holderName: holderName ?? '-',
    ticketType: apiTicket.ticketType === 'PAID' ? '유료 입장권 · 1인' : '무료 방문예약 · 1인',
    isPaid: apiTicket.ticketType === 'PAID',
    bookingNo: `TICKET-${apiTicket.ticketId}`,
    purchasedAt: apiTicket.issuedAt ? apiTicket.issuedAt.replace('T', ' ').slice(0, 16) : '',
    usedAt: apiTicket.status === 'USED' ? apiTicket.issuedAt : null,
    status: apiTicket.status,
    qrImageBase64: apiTicket.qrImageBase64,
  };
}

const MY_TICKETS_KEY = 'customer_my_tickets_mock';

const DEFAULT_MOCK_TICKETS = [
  {
    id: 'default-ex20260908-inc4',
    expoId: 4,
    expoTitle: '2026 인천 스마트 모빌리티 위크',
    startsAt: '2026-09-08',
    endsAt: '2026-09-30',
    venue: '송도컨벤시아 인천',
    visitDate: '2026-09-08',
    holderName: '홍길동',
    ticketType: '무료 방문예약 · 1인',
    bookingNo: 'EX20260908-INC4',
    purchasedAt: '2026.09.01 10:00',
    usedAt: null,
  },
  {
    id: 'default-ex20260512-k7h9',
    expoId: 99,
    expoTitle: '2026 대구 국제 모터쇼',
    startsAt: '2026-05-12',
    endsAt: '2026-05-15',
    venue: 'EXCO 대구',
    visitDate: '2026-05-12',
    holderName: '홍길동',
    ticketType: '무료 방문예약 · 1인',
    bookingNo: 'EX20260512-K7H9',
    purchasedAt: '2026.05.10 14:32',
    usedAt: null,
  },
];
const DEFAULT_TICKET_IDS = new Set(DEFAULT_MOCK_TICKETS.map((t) => t.id));

export function getMyTickets() {
  try {
    const raw = localStorage.getItem(MY_TICKETS_KEY);
    const saved = raw ? JSON.parse(raw) : [];
    return saved.length > 0 ? saved : DEFAULT_MOCK_TICKETS;
  } catch {
    return DEFAULT_MOCK_TICKETS;
  }
}

export function getTicketsForExpo(expoId) {
  return getMyTickets().filter((t) => t.expoId === expoId);
}

export function addMyTicket(ticket) {
  try {
    const current = getMyTickets().filter((t) => !DEFAULT_TICKET_IDS.has(t.id));
    const next = [ticket, ...current];
    localStorage.setItem(MY_TICKETS_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [ticket];
  }
}

// CANCELLED(환불 완료)를 usedAt/만료보다 먼저 확인.
// 상태는 박람회 전체 기간(endsAt)이 아니라 "이 티켓의 방문일(visitDate)" 기준으로 판단한다 —
// 입장권은 하루짜리 QR이라 방문일이 지나면 그날치는 못 쓰고(만료), 아직 방문일이 안 왔으면 사용예정으로 구분한다.
export function getTicketStatus(ticket) {
  if (ticket.status === 'CANCELLED') return '환불';
  if (ticket.usedAt) return '사용완료';
  if (ticket.visitDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const visit = new Date(ticket.visitDate);
    visit.setHours(0, 0, 0, 0);
    if (visit.getTime() < today.getTime()) return '만료';
    if (visit.getTime() > today.getTime()) return '사용예정';
  }
  return '사용가능';
}

// "..." 메뉴에 환불 신청을 보여줄지 판단하는 화면단 체크(실제 권한/최종 판정은 항상 백엔드가 함).
export function isTicketRefundable(ticket) {
  if (!ticket.isPaid) return false;
  if (ticket.status !== 'ISSUED') return false;
  if (!ticket.visitDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const visit = new Date(ticket.visitDate);
  visit.setHours(0, 0, 0, 0);
  return visit.getTime() >= today.getTime();
}

export function isTicketCheckableToday(ticket) {
  if (!ticket.visitDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const visit = new Date(ticket.visitDate);
  visit.setHours(0, 0, 0, 0);
  return visit.getTime() === today.getTime();
}

export function markTicketUsed(ticketId) {
  const tickets = getMyTickets().map((t) =>
    t.id === ticketId ? { ...t, usedAt: new Date().toISOString() } : t
  );
  localStorage.setItem(MY_TICKETS_KEY, JSON.stringify(tickets));
  return tickets;
}