import { useEffect, useState } from 'react';
import { getMyConsultations } from '@/api/expo';

// 마이페이지 "예약한 상담" - 내 상담 신청 내역 조회
export function useMyConsultations() {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = () =>
    getMyConsultations()
      .then((data) => {
        setConsultations(data);
        setError(null);
      })
      .catch((err) => setError(err.response?.data?.error?.message ?? '상담 신청 내역을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));

  useEffect(() => {
    reload();
  }, []);

  return { consultations, loading, error, reload };
}
