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
  // 오늘(2026-09-08) 기준으로 이미 진행 중인 박람회 예시 — "QR 사전 입장(당일 체크인)" 테스트용
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

// 카드 썸네일용 그라데이션 (실제 이미지 없이 기존 exhibitor 화면과 동일한 방식)
export const CUSTOMER_EXPO_GRADIENTS = [
  'linear-gradient(135deg, #1e293b, #0f172a)',
  'linear-gradient(135deg, #7f1d1d, #1f2937)',
  'linear-gradient(135deg, #0e7490, #0f172a)',
];

export const CONSULTATION_TIME_SLOTS = [
  '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00',
];

// 박람회 id로 mock 목록에서 제목/장소/기간을 찾음. 실제 고객용 박람회 조회 API(/api/customer/expos)가
// 생기기 전까지 쓰던 대체 수단 — 지금은 CustomerMyPage에서 실제 API로 조회한 expoMap을 우선 쓰고,
// 거기 없을 때만(예: mock 화면 등 아직 실API 연동 안 된 곳) 폴백으로 남겨둠.
export function findMockExpo(expoId) {
  return mockCustomerExpos.find((e) => e.expoId === expoId) ?? null;
}

// GET /api/customer/reservations 응답(TicketResponse)을 화면 표시용 형태로 변환.
// expoMap: 실제 GET /api/customer/expos 결과로 만든 Map<expoId, expo> — 반드시 이걸로 먼저 조회해야
// QR이 실제로 발급된 박람회와 화면에 뜨는 이름이 어긋나지 않는다(mock 목록은 expoId가 우연히 겹칠 뿐
// 실제 DB의 그 박람회와 무관한 이름이라 매치가 안 맞는 버그가 있었음).
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
    bookingNo: `TICKET-${apiTicket.ticketId}`,
    purchasedAt: apiTicket.issuedAt ? apiTicket.issuedAt.replace('T', ' ').slice(0, 16) : '',
    usedAt: apiTicket.status === 'USED' ? apiTicket.issuedAt : null,
    qrImageBase64: apiTicket.qrImageBase64,
  };
}

// "나의 입장권" mock 저장소 — 실제 목록 조회(GET /api/customer/reservations)는 이제 연동됐지만,
// "당일 입장권 구매" 결제~발급 구간은 아직 결제 금액을 알 방법이 없어(고객용 박람회 조회 API 미구현)
// 실제 연동을 못 해서 이 mock 저장소만 그 플로우 전용으로 남겨둠 — 마이페이지 목록에는 더 이상 안 씀.
const MY_TICKETS_KEY = 'customer_my_tickets_mock';

// 상태는 저장된 문자열을 그대로 믿지 않고 매번 계산함 — getTicketStatus 참고.
const DEFAULT_MOCK_TICKETS = [
  // 오늘(2026-09-08) 방문 예약 — "QR 사전 입장" 당일 체크인 테스트용 (아직 미사용 → 사용가능)
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
  // 이미 종료된 박람회(현재 목록에는 없는 과거 행사) — "만료" 탭 테스트용
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

// 특정 박람회에 대해 이미 발급받은 입장권이 있는지 확인 (있으면 "QR 사전 입장" 탭 노출용)
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

// 저장된 문자열이 아니라 매번 계산해서 판정 — 시간이 지나면 자동으로 만료로 넘어감.
// 이미 입장 체크(체크인)를 마친 QR은 "사용완료", 체크인 없이 박람회 기간만 끝난 QR은 "만료"로 구분.
export function getTicketStatus(ticket) {
  if (ticket.usedAt) return '사용완료';
  if (ticket.endsAt) {
    const end = new Date(ticket.endsAt);
    end.setHours(23, 59, 59, 999);
    if (new Date() > end) return '만료';
  }
  return '사용가능';
}

// 방문 예약일(visitDate)이 바로 오늘일 때만 "QR 사전 입장" 체크인 가능
export function isTicketCheckableToday(ticket) {
  if (!ticket.visitDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const visit = new Date(ticket.visitDate);
  visit.setHours(0, 0, 0, 0);
  return visit.getTime() === today.getTime();
}

// 체크인 처리 — 실제 체크인 API(ADMIN 전용, 현장 스캐너)와 별개로
// 고객 화면에서 "이미 입장 체크를 완료했다"는 상태만 표시하기 위한 mock 처리
export function markTicketUsed(ticketId) {
  const tickets = getMyTickets().map((t) =>
    t.id === ticketId ? { ...t, usedAt: new Date().toISOString() } : t
  );
  localStorage.setItem(MY_TICKETS_KEY, JSON.stringify(tickets));
  return tickets;
}

