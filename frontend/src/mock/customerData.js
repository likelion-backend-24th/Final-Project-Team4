// 일반 사용자(방문객)용 화면 목업 데이터.
// 차량/업체/상담 관련 API는 아직 백엔드(Expo 서비스)에 없어서, 실제 연동 전까지 화면 확인용으로 사용.
// 방문 예약(QR 발급)만 실제 Reservation 서비스 API(POST /api/customer/reservations)로 연동함.
//
// 주의: expoId(1/2/3)와 startsAt/endsAt은 로컬 expo DB의 실제 시드 데이터(Test Expo/Test Expo2/Test Expo3)와
// 맞춰둔 값 — Reservation 서비스가 내부적으로 실제 Expo 레코드의 시작일을 기준으로 무료/유료를 판정하므로,
// 여기 날짜가 실제 DB 값과 어긋나면 화면 표시(무료/유료)와 실제 API 응답이 서로 달라질 수 있음.
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

export const VEHICLE_BRANDS = [
  { key: 'ALL', label: '전체보기' },
  { key: 'HYUNDAI', label: '현대자동차' },
  { key: 'KIA', label: '기아' },
  { key: 'TESLA', label: '테슬라' },
  { key: 'BMW', label: 'BMW' },
  { key: 'BENZ', label: '벤츠' },
  { key: 'KGM', label: 'KG모빌리티' },
  { key: 'ETC', label: '기타' },
];

export const mockExhibitorGroups = {
  1: [
    {
      brand: 'HYUNDAI',
      name: '현대자동차',
      boothNo: 'A-101',
      vehicles: [
        {
          id: 'ioniq5',
          name: '아이오닉 5',
          tags: ['전기차', 'SUV'],
          startPrice: 52400000,
          summary: '새로운 시대를 여는 전기차, 아이오닉 5',
          description:
            '아이오닉 5는 전기차 전용 플랫폼 E-GMP 기반의 혁신적인 디자인과 넓은 실내 공간, 빠른 충전 성능을 갖춘 차세대 전기 SUV입니다.\n첨단 기술이 조화를 이루어 일상과 여행을 더욱 특별하게 만들어 줍니다.',
          range: '458 km',
          battery: '77.4 kWh',
          power: '325 ps',
        },
        {
          id: 'ioniq6',
          name: '아이오닉 6',
          tags: ['전기차', '세단'],
          startPrice: 50600000,
          summary: '공기역학의 정수, 아이오닉 6',
          description: '아이오닉 6는 스트림라이너 실루엣으로 완성된 초저항 디자인의 전기 세단입니다.',
          range: '524 km',
          battery: '77.4 kWh',
          power: '239 ps',
        },
        {
          id: 'kona-ev',
          name: '코나 EV',
          tags: ['전기차', 'SUV'],
          startPrice: 41000000,
          summary: '도심형 컴팩트 전기 SUV, 코나 EV',
          description: '코나 EV는 컴팩트한 사이즈에 넉넉한 주행거리를 담은 실용적인 도심형 전기 SUV입니다.',
          range: '417 km',
          battery: '64.8 kWh',
          power: '204 ps',
        },
        {
          id: 'santafe-hev',
          name: '싼타페 하이브리드',
          tags: ['하이브리드', 'SUV'],
          startPrice: 39800000,
          summary: '가족을 위한 넉넉한 하이브리드 SUV',
          description: '싼타페 하이브리드는 뛰어난 연비와 넓은 실내 공간을 동시에 갖춘 패밀리 SUV입니다.',
          range: '-',
          battery: '-',
          power: '230 ps',
        },
      ],
    },
    {
      brand: 'KIA',
      name: '기아',
      boothNo: 'A-205',
      vehicles: [
        {
          id: 'ev9',
          name: 'EV9',
          tags: ['전기차', 'SUV'],
          startPrice: 73400000,
          summary: '플래그십 전동화 SUV, EV9',
          description: 'EV9는 기아의 목적기반 모빌리티 철학을 담은 대형 전기 SUV입니다.',
          range: '501 km',
          battery: '99.8 kWh',
          power: '283 ps',
        },
        {
          id: 'ev6',
          name: 'EV6',
          tags: ['전기차', '해치'],
          startPrice: 47000000,
          summary: '역동적인 주행감성의 전기차, EV6',
          description: 'EV6는 E-GMP 플랫폼 기반의 스포티한 디자인과 빠른 충전을 갖춘 전기차입니다.',
          range: '475 km',
          battery: '77.4 kWh',
          power: '325 ps',
        },
        {
          id: 'sportage',
          name: '스포티지',
          tags: ['하이브리드', 'SUV'],
          startPrice: 28900000,
          summary: '베스트셀러 컴팩트 SUV, 스포티지',
          description: '스포티지는 세련된 디자인과 실용성을 갖춘 국민 SUV입니다.',
          range: '-',
          battery: '-',
          power: '180 ps',
        },
        {
          id: 'sorento',
          name: '쏘렌토',
          tags: ['하이브리드', 'SUV'],
          startPrice: 34200000,
          summary: '넉넉한 공간의 중형 하이브리드 SUV, 쏘렌토',
          description: '쏘렌토는 뛰어난 하이브리드 연비와 세련된 익스테리어를 갖춘 중형 SUV입니다.',
          range: '-',
          battery: '-',
          power: '230 ps',
        },
      ],
    },
  ],
};

export const CONSULTATION_TIME_SLOTS = [
  '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30',
];

// 박람회 id로 mock 목록에서 제목/장소/기간을 찾음 — 고객용 박람회 조회 API가 아직 없어서(Expo 서비스 소유,
// 이번 작업 범위 밖) Reservation 응답(TicketResponse, expoId만 있음)을 화면에 보여줄 때 이걸로 보강함.
export function findMockExpo(expoId) {
  return mockCustomerExpos.find((e) => e.expoId === expoId) ?? null;
}

// GET /api/customer/reservations 응답(TicketResponse)을 화면 표시용 형태로 변환.
// expo 제목/장소/기간은 mock 목록에서 보강 — 없는 박람회면 "박람회 #id"로 대체.
export function toDisplayTicket(apiTicket) {
  const expo = findMockExpo(apiTicket.expoId);
  return {
    id: `ticket-${apiTicket.ticketId}`,
    ticketId: apiTicket.ticketId,
    expoId: apiTicket.expoId,
    expoTitle: expo?.title ?? `박람회 #${apiTicket.expoId}`,
    startsAt: expo?.startsAt ?? null,
    endsAt: expo?.endsAt ?? null,
    venue: expo?.venue ?? '-',
    visitDate: apiTicket.visitDate,
    holderName: '홍길동',
    ticketType: apiTicket.ticketType === 'PAID' ? '당일 입장권 · 1인' : '무료 방문예약 · 1인',
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

export function findVehicle(expoId, vehicleId) {
  const groups = mockExhibitorGroups[expoId] ?? [];
  for (const group of groups) {
    const vehicle = group.vehicles.find((v) => v.id === vehicleId);
    if (vehicle) {
      return { vehicle, group };
    }
  }
  return null;
}
