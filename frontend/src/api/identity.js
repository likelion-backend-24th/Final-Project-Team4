import apiClient from "./client";

// GET /api/auth/me - 로그인한 사용자의 업체 및 담당자 정보
export const getMyProfile = () =>
  apiClient.get("/api/auth/me").then((res) => res.data.data);

// POST /api/auth/password-reset - 재설정 링크 발송 요청
export const requestPasswordReset = (email) =>
  apiClient.post("/api/auth/password-reset", { email }, { skipAuthRefresh: true });

// POST /api/auth/password-reset/confirm - 링크 토큰 + 새 비밀번호로 실제 변경
export const confirmPasswordReset = (token, newPassword) =>
  apiClient.post(
    "/api/auth/password-reset/confirm",
    { token, newPassword },
    { skipAuthRefresh: true },
  );
