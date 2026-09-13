import { useSyncExternalStore } from 'react';

// 데모용 토큰 저장소. accessToken은 body로 받아 localStorage에 보관,
// 요청 시 client.js 인터셉터가 Authorization: Bearer로 실어 보냄
const TOKEN_KEY = 'accessToken';
const ROLE_KEY = 'role';

// 토큰 변경(로그인 / 로그아웃 / 조용한 재발급) 시 구독 컴포넌트를 리렌더시킴
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

export const setAuth = (token, role) => {
  localStorage.setItem(TOKEN_KEY, token);
  if (role) localStorage.setItem(ROLE_KEY, role);
  notify();
};

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const getRole = () => localStorage.getItem(ROLE_KEY);

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  notify();
};

// role은 로그인 시 저장되고 로그아웃 / 재발급 실패(clearAuth) 시에만 지워지므로 세션 유지 여부의 기준이 됨.
// -> accessToken만 사라져도(만료 / 수동 삭제) 회원으로 보고 다음 요청의 401에서 재발급을 태움
export const isLoggedIn = () => Boolean(getRole());

// 반응형 로그인 상태. role이 바뀌면 이 훅을 쓰는 컴포넌트가 자동 리렌더됨
const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const useIsLoggedIn = () =>
  useSyncExternalStore(subscribe, () => Boolean(localStorage.getItem(ROLE_KEY)));

// 마이페이지에서 내 정보(이름 등)를 수정했을 때 헤더가 다시 조회하도록 알리는 용도
let profileVersion = 0;
export const notifyProfileUpdated = () => {
  profileVersion++;
  notify();
};
export const useProfileVersion = () => useSyncExternalStore(subscribe, () => profileVersion);
