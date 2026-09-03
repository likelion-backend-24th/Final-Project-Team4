// 데모용 토큰 저장소. accessToken은 body로 받아 localStorage에 보관,
// 요청 시 client.js 인터셉터가 Authorization: Bearer로 실어 보냄
const TOKEN_KEY = 'accessToken';
const ROLE_KEY = 'role';

export const setAuth = (token, role) => {
  localStorage.setItem(TOKEN_KEY, token);
  if (role) localStorage.setItem(ROLE_KEY, role);
};

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const getRole = () => localStorage.getItem(ROLE_KEY);

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
};

export const isLoggedIn = () => Boolean(getToken());
