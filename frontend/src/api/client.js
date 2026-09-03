import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080',
});

// TODO: Gateway가 JWT 검증 후 X-User-Id/X-User-Role을 주입하게 되면 이 인터셉터는 제거.
// 지금은 Gateway가 없어서 로컬 테스트용으로 프론트가 직접 헤더를 채워 넣음.
// /admin 경로에서는 관리자 시딩 계정(id=1) 기준으로 자동 전환.
apiClient.interceptors.request.use((config) => {
  const isAdminPath = window.location.pathname.startsWith('/admin');
  if (isAdminPath) {
    config.headers['X-User-Id'] = 1;
    config.headers['X-User-Role'] = 'ADMIN';
  } else {
    const devUserId = import.meta.env.VITE_DEV_USER_ID;
    const devUserRole = import.meta.env.VITE_DEV_USER_ROLE;
    if (devUserId) config.headers['X-User-Id'] = devUserId;
    if (devUserRole) config.headers['X-User-Role'] = devUserRole;
  }
  return config;
});

export default apiClient;
