import apiClient from "./client";

// GET /api/auth/me - 로그인한 사용자의 업체 및 담당자 정보
export const getMyProfile = () =>
  apiClient.get("/api/auth/me").then((res) => res.data.data);

// DELETE /api/auth/me - 회원 탈퇴(soft delete)
export const withdrawAccount = () => apiClient.delete("/api/auth/me");

// PATCH /api/auth/me - 일반회원 정보 수정 (이름/휴대폰 번호)
export const updateMyProfile = (data) =>
  apiClient.patch("/api/auth/me", data).then((res) => res.data.data);

// PATCH /api/auth/exhibitors/me - 참가업체 정보 수정
export const updateExhibitorProfile = (data) =>
  apiClient.patch("/api/auth/exhibitors/me", data).then((res) => res.data.data);

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

// POST /api/auth/email-verification/code - 회원가입 전 이메일 인증 코드 발송
export const sendVerificationCode = (email) =>
  apiClient.post(
    "/api/auth/email-verification/code",
    { email },
    { skipAuthRefresh: true },
  );

// POST /api/auth/email-verification/confirm - 인증 코드 확인
export const confirmVerificationCode = (email, code) =>
  apiClient.post(
    "/api/auth/email-verification/confirm",
    { email, code },
    { skipAuthRefresh: true },
  );

// GET /api/admin/users - 관리자 회원 목록 조회(검색/필터/가입일 기간/페이징)
export const getAdminUsers = (params) =>
  apiClient.get("/api/admin/users", { params }).then((res) => res.data.data);

// GET /api/admin/users/stats?role= - 참관객 화면 상단 통계 카드(전체/활성/오늘 가입/탈퇴). role은 필수(현재는 USER 전용).
export const getAdminUserStats = (role) =>
  apiClient.get("/api/admin/users/stats", { params: { role } }).then((res) => res.data.data);

// GET /api/admin/users/exhibitors/stats - 참가업체 화면 상단 통계 카드(전체 업체/활성 업체/참가중 업체/미참가 업체).
export const getAdminExhibitorStats = () =>
  apiClient.get("/api/admin/users/exhibitors/stats").then((res) => res.data.data);

// GET /api/admin/users/{id} - 관리자 회원 상세 조회
export const getAdminUserDetail = (userId) =>
  apiClient.get(`/api/admin/users/${userId}`).then((res) => res.data.data);

// PATCH /api/admin/users/{id}/status - 회원 정지/정지 해제 (status: "ACTIVE" | "LOCKED")
export const updateAdminUserStatus = (userId, status) =>
  apiClient.patch(`/api/admin/users/${userId}/status`, { status }).then((res) => res.data.data);

// GET /api/admin/users/export - 조건에 맞는 회원 목록 CSV(엑셀에서 바로 열림) 다운로드.
// ApiResponse 포맷이 아니라 파일이 그대로 내려오므로 res.data(blob)와 응답 헤더를 함께 반환한다.
export const exportAdminUsers = (params) =>
  apiClient
    .get("/api/admin/users/export", { params, responseType: "blob" })
    .then((res) => ({ blob: res.data, headers: res.headers }));