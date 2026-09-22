import { useEffect, useState } from 'react';
import { getMyReservations } from '@/api/reservation';
import { getCustomerExpoList } from '@/api/expo';

// 마이페이지 "나의 입장권" - 실제 Reservation 서비스(GET /api/customer/reservations)에서 조회.
// 티켓 응답엔 expoId만 있어서, 이름/장소/기간 표시는 실제 Expo 서비스(GET /api/customer/expos)를
// 같이 조회해 expoId로 매칭해야 함.
// 환불 처리 후에도 reload()를 다시 불러 목록을 새로고침한다(RefundRequestModal의 onRefunded).
export function useMyTickets() {
  const [apiTickets, setApiTickets] = useState([]);
  const [expoMap, setExpoMap] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = () =>
    Promise.all([getMyReservations(), getCustomerExpoList({ page: 0, size: 100 })])
      .then(([tickets, expoRes]) => {
        setApiTickets(tickets);
        setExpoMap(new Map(expoRes.content.map((e) => [e.expoId, e])));
        setError(null);
      })
      .catch((err) => setError(err.response?.data?.error?.message ?? '입장권 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));

  useEffect(() => {
    reload();
  }, []);

  return { apiTickets, expoMap, loading, error, reload };
}
