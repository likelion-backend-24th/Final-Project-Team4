import { useEffect, useState } from 'react';
import { getMyProfile } from '@/api/identity';

// 마이페이지 "내 정보" - 로그인한 회원 프로필 조회.
export function useMyProfile() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getMyProfile()
      .then((data) => {
        setProfile(data);
        setError(null);
      })
      .catch((err) => setError(err.response?.data?.error?.message ?? '내 정보를 불러오지 못했습니다.'));
  }, []);

  return { profile, setProfile, error };
}
