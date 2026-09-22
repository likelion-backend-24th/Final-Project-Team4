import { useEffect, useState } from 'react';
import { getMyPayments } from '@/api/payment';

// 마이페이지 "참가비 결제 내역" - 내 부스 참가비 결제 목록 조회
export function useMyBoothPayments() {
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState(null);

  const reload = () =>
    getMyPayments()
      .then(setPayments)
      .catch((err) => setError(err.response?.data?.error?.message ?? '결제 내역을 불러오지 못했습니다.'));

  useEffect(() => {
    reload();
  }, []);

  return { payments, error, reload };
}
