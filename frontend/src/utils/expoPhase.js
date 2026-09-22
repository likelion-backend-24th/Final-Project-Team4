// 신청/개최 기간과 현재 시각을 비교해서 진행 단계를 계산 (ExpoList/CustomerExpoList/ExpoDetail 공용)
export const phaseOf = (e) => {
  const now = Date.now();
  const at = (s) => new Date(s).getTime();
  if (now < at(e.applyStartsAt)) return '모집예정';
  if (now <= at(e.applyEndsAt)) return '모집중';
  if (now < at(e.startsAt)) return '모집마감';
  if (now <= at(e.endsAt)) return '진행중';
  return '종료';
};

// 고객 화면 전용 - 부스 모집 상태(모집중/모집마감)는 방문객과 무관하므로 "예약가능"으로 통합
export const customerPhaseOf = (e) => {
  const p = phaseOf(e);
  if (p === '모집중' || p === '모집마감') return '예약가능';
  if (p === '모집예정') return '오픈예정';
  return p; // 진행중, 종료
};
