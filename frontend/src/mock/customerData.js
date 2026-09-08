// 일반 사용자(방문객)용 화면 목업 데이터.
// 차량/업체/상담 관련 API는 아직 백엔드(Expo 서비스)에 없어서, 실제 연동 전까지 화면 확인용으로 사용.
// 사전 체크인(QR 발급)만 실제 Reservation 서비스 API(POST /api/customer/reservations)로 연동함.

export const mockCustomerExpos = [
  {
    expoId: 1,
    title: '2026 서울 모빌리티 엑스포',
    venue: 'COEX 서울 코엑스 A, B',
    startsAt: '2026-05-12',
    endsAt: '2026-05-15',
    phase: '진행중',
    boothCount: 128,
  },
  {
    expoId: 2,
    title: '2026 부산 국제 자동차 박람회',
    venue: 'BEXCO 부산 벡스코',
    startsAt: '2026-07-20',
    endsAt: '2026-07-24',
    phase: '모집중',
    boothCount: 34,
  },
  {
    expoId: 3,
    title: '2026 대한민근 모빌리티 전장·SW 페어',
    venue: 'KINTEX 일산 킨텍스',
    startsAt: '2026-09-09',
    endsAt: '2026-09-10',
    phase: '모집예정',
    boothCount: 0,
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

// "나의 입장권" 목업 저장소. 실제 티켓 조회/발급 API가 아직 없어서
// 사전 체크인/당일 입장권 구매 플로우 완료 시 localStorage에 쌓아두고 마이페이지에서 그대로 보여줌.
const MY_TICKETS_KEY = 'customer_my_tickets_mock';

const DEFAULT_MOCK_TICKET = {
  id: 'default-ex20260512-k7h9',
  expoTitle: '2026 서울 모빌리티 엑스포',
  startsAt: '2026-05-12',
  endsAt: '2026-05-15',
  venue: 'COEX 서울 코엑스 A, B',
  holderName: '홍길동',
  ticketType: '일반 관람객 · 1인',
  bookingNo: 'EX20260512-K7H9',
  purchasedAt: '2026.05.10 14:32',
  status: '사용가능',
};

export function getMyTickets() {
  try {
    const raw = localStorage.getItem(MY_TICKETS_KEY);
    const saved = raw ? JSON.parse(raw) : [];
    return saved.length > 0 ? saved : [DEFAULT_MOCK_TICKET];
  } catch {
    return [DEFAULT_MOCK_TICKET];
  }
}

export function addMyTicket(ticket) {
  try {
    const current = getMyTickets().filter((t) => t.id !== 'default-ex20260512-k7h9');
    const next = [ticket, ...current];
    localStorage.setItem(MY_TICKETS_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [ticket];
  }
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
