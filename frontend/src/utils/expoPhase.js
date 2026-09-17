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
