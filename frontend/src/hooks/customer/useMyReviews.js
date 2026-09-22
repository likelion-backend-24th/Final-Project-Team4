import { useEffect, useState } from 'react';
import { getMyReviews } from '@/api/expo';

// 마이페이지 "내가 쓴 후기" - 내가 작성한 후기 목록 조회
export function useMyReviews() {
  const [myReviews, setMyReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = () =>
    getMyReviews()
      .then((data) => {
        setMyReviews(data);
        setError(null);
      })
      .catch((err) => setError(err.response?.data?.error?.message ?? '작성한 후기를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));

  useEffect(() => {
    reload();
  }, []);

  return { myReviews, loading, error, reload };
}
