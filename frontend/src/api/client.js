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

// 백엔드는 의존 서비스 확인이 안 될 때 요청을 함부로 성공으로 열지 않고 fail-closed로
// 202(DEPENDENCY_TIMEOUT) + { error: {...} } 바디를 내려준다 — HTTP 상태만 보면 2xx라
// axios가 그냥 성공(.then)으로 흘려보내서, 실제로는 아무 것도 처리 안 됐는데 화면엔
// 성공한 것처럼 보이는 문제가 있었다(상담 신청이 "완료"로 뜨지만 실제로 저장 안 되는 등).
// 응답 바디에 error가 있으면 상태 코드가 2xx여도 실패로 취급해 기존 .catch(err =>
// err.response?.data?.error?.message) 경로를 그대로 타게 만든다.
apiClient.interceptors.response.use((response) => {
  if (response.data && response.data.error) {
    return Promise.reject({ response, isAxiosError: true, message: response.data.error.message });
  }
  return response;
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
