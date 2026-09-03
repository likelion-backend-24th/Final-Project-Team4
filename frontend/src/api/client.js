import axios from 'axios';
import { getToken, clearAuth } from './auth';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080',
});

// 로그인 시 저장한 accessToken을 모든 요청에 Bearer로 실음.
// Gateway가 이 토큰을 검증하고 X-User-Id / X-User-Role을 하위 서비스에 주입
apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 인증 만료/누락(401)이면 토큰 비우고 로그인 화면으로 이동
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      clearAuth();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default apiClient;
