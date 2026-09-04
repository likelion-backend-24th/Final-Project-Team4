import apiClient from './client';

// GET /api/exhibitor/expos — OPEN 박람회 목록 페이징 조회
export const getExpoList = (params) =>
  apiClient.get('/api/exhibitor/expos', { params }).then((res) => res.data.data);

// GET /api/exhibitor/expos/{expoId}/booths — 박람회 부스 목록 조회
export const getExpoBooths = (expoId, status) =>
  apiClient
    .get(`/api/exhibitor/expos/${expoId}/booths`, { params: status ? { status } : undefined })
    .then((res) => res.data.data);

// POST /api/exhibitor/booth-applications — 다중 부스 선택 신청/임시저장 (그룹 단위)
// payload: { expoId, boothIds: number[], exhibitionItem, conceptDescription,
//            powerRequested, waterSupplyRequested, internetRequested, additionalRequest,
//            saveMode: 'DRAFT' | 'SUBMIT' }
export const applyBooth = (payload) =>
  apiClient
    .post('/api/exhibitor/booth-applications', payload)
    .then((res) => res.data.data);

// PATCH /api/exhibitor/booth-applications/groups/{groupId} — 임시저장 그룹 수정
export const updateBoothApplicationDraft = (groupId, payload) =>
  apiClient
    .patch(`/api/exhibitor/booth-applications/groups/${groupId}`, payload)
    .then((res) => res.data.data);

// POST /api/exhibitor/booth-applications/groups/{groupId}/submit — 임시저장 최종 제출
export const submitBoothApplicationDraft = (groupId) =>
  apiClient
    .post(`/api/exhibitor/booth-applications/groups/${groupId}/submit`)
    .then((res) => res.data.data);

// DELETE /api/exhibitor/booth-applications/groups/{groupId} — 신청 취소
export const deleteBoothApplicationGroup = (groupId) =>
  apiClient
    .delete(`/api/exhibitor/booth-applications/groups/${groupId}`)
    .then((res) => res.data.data);

// GET /api/exhibitor/booth-applications — 마이페이지: 내 부스 신청 내역 (그룹 단위)
export const getMyBoothApplications = (params) =>
  apiClient.get('/api/exhibitor/booth-applications', { params }).then((res) => res.data.data);

// GET /api/admin/booth-applications — Admin: 전체 부스 신청 내역 (그룹 단위)
export const getAdminBoothApplications = (params) =>
  apiClient.get('/api/admin/booth-applications', { params }).then((res) => res.data.data);

// POST /api/admin/expos — Admin: 박람회 등록 (DRAFT 상태로 생성)
// payload: { title, venue, startsAt, endsAt, applyStartsAt, applyEndsAt,
//            booths: [{ boothNo, type, fee }] }
export const registerExpo = (payload) =>
  apiClient.post('/api/admin/expos', payload).then((res) => res.data.data);

// POST /api/admin/expos/{expoId}/open — Admin: 박람회 공개 (DRAFT → OPEN)
export const openExpo = (expoId) =>
  apiClient.post(`/api/admin/expos/${expoId}/open`).then((res) => res.data.data);

// GET /api/admin/expos — Admin: 전체 박람회 목록 + 박람회별 신청 현황 집계
export const getAdminExpoList = (params) =>
  apiClient.get('/api/admin/expos', { params }).then((res) => res.data.data);

// GET /api/admin/expos/{expoId}/booths — Admin: 특정 박람회 실시간 부스 배치 현황
export const getAdminExpoBooths = (expoId) =>
  apiClient.get(`/api/admin/expos/${expoId}/booths`).then((res) => res.data.data);

// POST /api/admin/booth-applications/{applicationId}/approve — Admin: 부스 신청 승인
export const approveBoothApplication = (applicationId) =>
  apiClient
    .post(`/api/admin/booth-applications/${applicationId}/approve`)
    .then((res) => res.data.data);

// POST /api/admin/booth-applications/{applicationId}/reject — Admin: 부스 신청 반려
export const rejectBoothApplication = (applicationId, reason) =>
  apiClient
    .post(`/api/admin/booth-applications/${applicationId}/reject`, { reason })
    .then((res) => res.data.data);
