import axios from 'axios';
import createAuthRefreshInterceptor from 'axios-auth-refresh';
import { getToken, setAuth, clearAuth } from './auth';

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true, // refreshToken HttpOnly 쿠키 송수신 (로그인 저장 / 로그아웃 만료 / 재발급)
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

// 401이면 refreshToken 쿠키로 accessToken 재발급 후 원요청 자동 재시도.
// 재발급이 실패해야만 로그인 화면으로 보냄. 재발급 성공 시엔 리다이렉트 없음.
const refreshAuth = () =>
  axios
    .post(`${apiBaseUrl}/api/auth/refresh`, null, { withCredentials: true })
    .then((res) => {
      const { accessToken, role } = res.data.data;
      setAuth(accessToken, role); // 재시도 요청은 request 인터셉터가 이 토큰을 다시 붙임
    })
    .catch((err) => {
      clearAuth();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
      throw err;
    });

createAuthRefreshInterceptor(apiClient, refreshAuth, {
  statusCodes: [401],
  deduplicateRefresh: false, // 동시에 터진 401들이 각자 거부되지 않고 공유된 단일 refresh 호출을 기다렸다가 각각 재시도하도록 함 (잘못된 로그인 리다이렉트 방지).
});

export default apiClient;
