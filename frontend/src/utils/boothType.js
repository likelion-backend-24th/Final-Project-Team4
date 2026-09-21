// booth.type 문자열로 먹거리 부스 여부 판별 (백엔드 enum 없이 자유 문자열이라 키워드 매칭)
export const isFoodBooth = (type) => /푸드|먹거리|food/i.test(type ?? '');

// 이미 고른 부스가 있으면 그 종류('food' | 'main')를 돌려줌. 먹거리와 조립 부스를 한 신청에 섞지 않도록
export const getSelectedKind = (booths, selectedIds) => {
  const first = booths.find((b) => selectedIds.includes(b.boothId ?? b.id));
  if (!first) return null;
  return isFoodBooth(first.type) ? 'food' : 'main';
};

export const BOOTH_VIEW_MODES = [
  { key: 'BOOTH', label: '부스 참가' },
  { key: 'FOOD', label: '먹거리 부스 참가' },
];

// boothNo("A-101")의 "-" 앞부분을 홀 이름으로 사용. 규칙에 안 맞으면 "기타"로 묶음.
export const getBoothHall = (boothNo) => {
  const m = /^([^-]+)-/.exec(boothNo ?? '');
  return m ? m[1] : '기타';
};