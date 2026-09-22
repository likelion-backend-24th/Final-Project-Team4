import { useEffect, useState } from 'react';
import { getLeads } from '@/api/leads';

// QR 리드 확보 화면의 리드 목록 - 선택한 부스(boothId)의 리드를 조회.
// 스캔/이메일 저장/AI 요약/발송/방문 확인 등 거의 모든 조작 뒤에 refresh()로 다시 불러온다.
export function useLeads(boothId) {
  const [leads, setLeads] = useState([]);

  const refresh = () => getLeads(boothId).then(setLeads);

  useEffect(() => {
    if (boothId != null) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boothId]);

  return { leads, setLeads, refresh };
}
