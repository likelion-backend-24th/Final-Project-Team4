import { useEffect, useState } from 'react';
import { getMyBooths } from '@/api/leads';

// QR 리드 확보 화면의 박람회/부스 선택 목록 - 내 확정 부스 조회
export function useMyBooths() {
  const [myBooths, setMyBooths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getMyBooths()
      .then(setMyBooths)
      .catch((err) => setError(err.response?.data?.error?.message ?? err.message))
      .finally(() => setLoading(false));
  }, []);

  return { myBooths, loading, error };
}
