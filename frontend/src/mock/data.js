export const mockExpos = [
  {
    id: 1,
    title: '2026 서울 모빌리티 엑스포 (Seoul Mobility Expo)',
    shortTitle: '2026 서울 모빌리티 엑스포 (Seoul M...',
    venue: 'COEX 서울 코엑스 홀 A, B',
    fullVenue: 'COEX 서울 코엑스 홀 A, B 전관',
    startsAt: '2026.05.12',
    endsAt: '2026.05.15',
    period: '2026년 5월 12일(화) - 5월 15일(금) [4일간]',
    host: '한국모빌리티산업협회 (KAMA)',
    fee: '독립 부스 2,500,000원 / 조립 부스 3,500,000원 (VAT 별도)',
    applyPeriod: '2026.01.10 - 2026.04.15',
    status: '모집중',
    availableBoothCount: 12,
    totalBoothCount: 120,
    submittedBoothCount: 108,
    theme: 'blue',
    booths: buildBooths('A', 4, 8, [
      'A-101', 'A-104', 'A-106', 'A-108', 'A-201', 'A-203', 'A-204', 'A-207', 'A-208',
      'A-301', 'A-304', 'A-306', 'A-307', 'A-402', 'A-404', 'A-405', 'A-406', 'A-408',
    ]),
    selectedBoothId: 'A-205',
  },
  {
    id: 2,
    title: '2026 부산 국제 자동차 박람회 (Busan International Motor Show)',
    shortTitle: '2026 부산 국제 자동차 박람회 (Busan...',
    venue: 'BEXCO 부산 벡스코 제2전시장',
    fullVenue: 'BEXCO 부산 벡스코 제2전시장',
    startsAt: '2026.07.20',
    endsAt: '2026.07.24',
    period: '2026년 7월 20일(월) - 7월 24일(금) [5일간]',
    host: '부산광역시·벡스코',
    fee: '독립 부스 2,000,000원 / 조립 부스 3,000,000원 (VAT 별도)',
    applyPeriod: '2026.02.01 - 2026.06.01',
    status: '모집중',
    availableBoothCount: 34,
    totalBoothCount: 150,
    submittedBoothCount: 116,
    theme: 'red',
    booths: buildBooths('B', 5, 8, []),
  },
  {
    id: 3,
    title: '2026 대한민국 모빌리티 전장·S/W 페어',
    shortTitle: '2026 대한민국 모빌리티 전장·S/W 페어',
    venue: 'KINTEX 일산 킨텍스 제1홀',
    fullVenue: 'KINTEX 일산 킨텍스 제1홀',
    startsAt: '2026.09.08',
    endsAt: '2026.09.10',
    period: '2026년 9월 8일(화) - 9월 10일(목) [3일간]',
    host: '한국전자정보통신산업진흥회',
    fee: '독립 부스 3,000,000원 / 조립 부스 4,000,000원 (VAT 별도)',
    applyPeriod: '2026.03.01 - 2026.07.01',
    status: '모집마감',
    availableBoothCount: 0,
    totalBoothCount: 96,
    submittedBoothCount: 96,
    theme: 'cyan',
    booths: buildBooths('C', 4, 8, []),
  },
  {
    id: 4,
    title: '2026 글로벌 자율주행 기술 대전',
    shortTitle: '2026 글로벌 자율주행 기술 대전',
    venue: 'COEX 서울 코엑스 컨벤션홀',
    fullVenue: 'COEX 서울 코엑스 컨벤션홀',
    startsAt: '2026.11.02',
    endsAt: '2026.11.04',
    period: '2026년 11월 2일(월) - 11월 4일(수) [3일간]',
    host: '한국모빌리티산업협회 (KAMA)',
    fee: '독립 부스 2,800,000원 / 조립 부스 3,800,000원 (VAT 별도)',
    applyPeriod: '2026.06.01 - 2026.10.01',
    status: '모집중',
    availableBoothCount: 8,
    totalBoothCount: 80,
    submittedBoothCount: 72,
    theme: 'green',
    booths: buildBooths('D', 4, 8, []),
  },
];

function buildBooths(prefix, rows, cols, assignedNos) {
  const booths = [];
  for (let r = 1; r <= rows; r += 1) {
    for (let c = 1; c <= cols; c += 1) {
      const boothNo = `${prefix}-${r}${String(c).padStart(2, '0')}`;
      booths.push({
        id: `${prefix}-${r}-${c}`,
        boothNo,
        type: (r + c) % 2 === 0 ? '조립' : '독립',
        fee: (r + c) % 2 === 0 ? 3500000 : 2500000,
        status: assignedNos.includes(boothNo) ? 'ASSIGNED' : 'AVAILABLE',
      });
    }
  }
  return booths;
}

export const mockMyProfile = {
  companyName: '현대모비스(주)',
  businessNumber: '220-81-XXXXX',
  managerName: '김민우 과장',
  email: 'mw.kim@mobis.com',
  mobile: '010-1234-5678',
  companyPhone: '02-2018-XXXX',
};

export const mockMyApplications = [
  {
    id: 1,
    expoTitle: '2026 서울 모빌리티 엑스포 (Seoul Mobility Expo)',
    boothNo: 'A-105 (조립)',
    appliedAt: '2026.01.20',
    status: '심사중',
  },
  {
    id: 2,
    expoTitle: '2026 글로벌 자율주행 기술 대전',
    boothNo: 'B-204 (독립)',
    appliedAt: '2026.01.15',
    status: '신청 승인',
  },
];

export const mockPayments = [
  {
    id: 1,
    expoTitle: '2026 서울 모빌리티 엑스포',
    amount: 3500000,
    status: '미결제',
    paidAt: null,
  },
  {
    id: 2,
    expoTitle: '2025 대한민국 미래 모빌리티 엑스포',
    amount: 2500000,
    status: '결제완료',
    paidAt: '2025.10.12 14:22',
  },
];

export const mockPastExhibits = [
  {
    id: 1,
    expoTitle: '2025 대한민국 미래 모빌리티 엑스포',
    venue: 'EXCO 대구',
    period: '2025.10.23 - 10.25',
    status: '참가 완료',
    feedback: '작성 완료',
  },
];

export const mockAdminStats = {
  total: 128,
  pending: 14,
  approved: 106,
  rejected: 8,
};

export const mockAdminApplications = [
  {
    no: 128,
    companyName: '현대모비스(주)',
    businessNumber: '220-81-XXXXX',
    ceoName: '정의선',
    managerEmail: 'mw.kim@mobis.com',
    expoTitle: '2026 서울 모빌리티 엑스포 (Seoul Mobility Expo)',
    boothNo: 'A-105',
    boothLocation: 'A-105 (전시장 입구 정면 코너)',
    boothSpec: '조립형 부스 (3m x 3m, 단면오픈형)',
    exhibitionItem: '자율주행 레벨 4 지원 차세대 LiDAR 모듈 및 전장 S/W 제어기',
    conceptDescription:
      '전시장에 실제 차량을 구현하여 스마트 시티 인프라와의 통신 과정을 관람객들이 직접 테스트할 수 있는 체험형 존 제공',
    additionalRequest: '전시장 1층 전력 공급 3kW 추가 지원 필요, 천장 조명 연결선 연장 요청',
    appliedAt: '2026.01.20',
    reviewedAt: null,
    status: '심사중',
  },
  {
    no: 127,
    companyName: '(주)한온시스템',
    expoTitle: '2026 서울 모빌리티 엑스포 (Seoul Mobility Expo)',
    boothNo: 'B-201',
    appliedAt: '2026.01.19',
    status: '승인',
  },
  {
    no: 126,
    companyName: '만도 헬라 S/W',
    expoTitle: '2026 글로벌 자율주행 기술 대전',
    boothNo: 'C-11',
    appliedAt: '2026.01.18',
    status: '반려',
  },
  {
    no: 125,
    companyName: '에스엘(주)',
    expoTitle: '2026 서울 모빌리티 엑스포 (Seoul Mobility Expo)',
    boothNo: 'A-108',
    appliedAt: '2026.01.15',
    status: '승인',
  },
  {
    no: 124,
    companyName: '(주)경신전선',
    expoTitle: '2026 대한민국 모빌리티 전장·S/W 페어',
    boothNo: 'A-205',
    appliedAt: '2026.01.12',
    status: '심사중',
  },
];
