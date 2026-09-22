import { useEffect, useState } from 'react';

// 관리자 회원 관리 화면 상단 통계 카드용 조회
// 통계 조회 실패는 카드만 숨기고(null 유지) 목록 조회는 그대로 진행.
// fetchStats: getAdminUserStats('USER') 처럼 인자를 이미 바인딩해서 넘김(참관객/참가업체마다 응답 모양이 달라서 통계 자체를 공용화하진 않음).
export function useAdminMemberStats(fetchStats) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats().then(setStats).catch(() => {});
  }, []);

  return stats;
}
