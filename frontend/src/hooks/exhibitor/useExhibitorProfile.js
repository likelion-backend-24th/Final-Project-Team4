import { useEffect, useState } from 'react';
import { getMyProfile } from '../../api/identity';

// 마이페이지 "업체 및 담당자 정보" - 로그인한 참가업체 프로필 조회.
export function useExhibitorProfile() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getMyProfile()
      .then(setProfile)
      .catch((err) => setError(err.response?.data?.error?.message ?? '업체 정보를 불러오지 못했습니다.'));
  }, []);

  return { profile, setProfile, error };
}
