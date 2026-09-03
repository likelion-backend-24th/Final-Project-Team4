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

// accessToken(JWT) payload의 sub = 로그인한 사용자 id.
// payment API가 body로 userId를 요구해서 임시로 프론트에서 꺼내 씀 (게이트웨이 X-User-Id 전환 전).
export const getUserId = () => {
  const token = getToken();
  if (!token) return null;
  try {
    return Number(JSON.parse(atob(token.split('.')[1])).sub);
  } catch {
    return null;
  }
};
