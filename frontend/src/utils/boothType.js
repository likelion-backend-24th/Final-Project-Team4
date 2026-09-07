// booth.type 문자열로 먹거리 부스 여부 판별 (백엔드 enum 없이 자유 문자열이라 키워드 매칭)
export const isFoodBooth = (type) => /푸드|먹거리|food/i.test(type ?? '');

export const BOOTH_VIEW_MODES = [
  { key: 'BOOTH', label: '부스 참가' },
  { key: 'FOOD', label: '먹거리 부스 참가' },
];
