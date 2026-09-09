import apiClient from "./client";

// GET /api/auth/me - 로그인한 사용자의 업체 및 담당자 정보
export const getMyProfile = () =>
  apiClient.get("/api/auth/me").then((res) => res.data.data);
