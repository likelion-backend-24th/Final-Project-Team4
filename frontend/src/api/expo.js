import apiClient, { apiBaseUrl } from './client';

// 서버가 내려주는 상대 경로(/uploads/...)를 화면에 표시 가능한 절대 URL로 변환
export const toAssetUrl = (path) => (path ? `${apiBaseUrl}${path}` : null);

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

// GET /api/customer/expos - 비회원 공개 박람회 목록 (게이트웨이 화이트리스트, 로그인 불필요)
export const getCustomerExpoList = (params) =>
  apiClient.get('/api/customer/expos', { params }).then((res) => res.data.data);

// GET /api/customer/expos/{expoId} - 비회원 공개 박람회 단건 상세
export const getCustomerExpo = (expoId) =>
  apiClient.get(`/api/customer/expos/${expoId}`).then((res) => res.data.data);

// GET /api/customer/expos/{expoId}/vehicles - 참가 확정 부스별 전시 차량 목록 (비회원 조회 가능)
export const getCustomerExpoVehicles = (expoId) =>
  apiClient.get(`/api/customer/expos/${expoId}/vehicles`).then((res) => res.data.data);

// GET /api/exhibitor/booths/{boothId} — 참가 확정 부스 관리 정보(부스 정보 + 콘텐츠 + 배너) 조회
export const getBoothManageDetail = (boothId) =>
  apiClient.get(`/api/exhibitor/booths/${boothId}`).then((res) => res.data.data);

// PUT /api/exhibitor/booths/{boothId}/content — 부스 소개 콘텐츠 등록/수정
export const updateBoothContent = (boothId, payload) =>
  apiClient.put(`/api/exhibitor/booths/${boothId}/content`, payload).then((res) => res.data.data);

// PUT /api/exhibitor/booths/{boothId}/banner-image — 부스 배너 이미지 등록/교체 (multipart)
export const uploadBoothBannerImage = (boothId, file) => {
  const formData = new FormData();
  formData.append('image', file);
  return apiClient
    .put(`/api/exhibitor/booths/${boothId}/banner-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data.data);
};

// GET /api/exhibitor/booths/{boothId}/vehicles — 부스에 등록된 전시 차량 목록
export const getBoothVehicles = (boothId) =>
  apiClient.get(`/api/exhibitor/booths/${boothId}/vehicles`).then((res) => res.data.data);

// POST /api/exhibitor/booths/{boothId}/vehicles — 전시 차량 등록
// payload: { name, tags: string[], startPrice, summary, description, features, colors, range, battery, power }
export const registerVehicle = (boothId, payload) =>
  apiClient.post(`/api/exhibitor/booths/${boothId}/vehicles`, payload).then((res) => res.data.data);

// PUT /api/exhibitor/booths/{boothId}/vehicles/{vehicleId} — 전시 차량 수정
export const updateVehicle = (boothId, vehicleId, payload) =>
  apiClient
    .put(`/api/exhibitor/booths/${boothId}/vehicles/${vehicleId}`, payload)
    .then((res) => res.data.data);

// DELETE /api/exhibitor/booths/{boothId}/vehicles/{vehicleId} — 전시 차량 삭제
export const deleteVehicle = (boothId, vehicleId) =>
  apiClient.delete(`/api/exhibitor/booths/${boothId}/vehicles/${vehicleId}`).then((res) => res.data.data);

// POST /api/exhibitor/booths/{boothId}/vehicles/{vehicleId}/images — 차량 이미지 추가 (multipart, 최대 5장)
export const addVehicleImage = (boothId, vehicleId, file) => {
  const formData = new FormData();
  formData.append('image', file);
  return apiClient
    .post(`/api/exhibitor/booths/${boothId}/vehicles/${vehicleId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data.data);
};

// DELETE /api/exhibitor/booths/{boothId}/vehicles/{vehicleId}/images/{imageId} — 차량 이미지 삭제
export const deleteVehicleImage = (boothId, vehicleId, imageId) =>
  apiClient
    .delete(`/api/exhibitor/booths/${boothId}/vehicles/${vehicleId}/images/${imageId}`)
    .then((res) => res.data.data);

// POST /api/customer/consultations — 참가업체 구매/시승 상담 신청 (여러 업체 한 번에 신청 가능, 업체별로 1건씩 생성됨)
// payload: { boothIds, customerName, customerPhone, customerEmail, wantsPurchase, wantsTestDrive,
//            interestedVehicle, hasDriverLicense, preferredDate, preferredTime, message }
// 응답: ConsultationResponse[] (boothIds 개수만큼)
export const applyConsultation = (payload) =>
  apiClient.post('/api/customer/consultations', payload).then((res) => res.data.data);

// GET /api/customer/consultations — 고객 마이페이지: 내 상담 신청 내역
// 응답에 boothNo/vehicleName/expoTitle이 같이 내려와서 어느 박람회·어느 차량에 신청한
// 상담인지 프론트에서 별도 조회 없이 바로 표시할 수 있다.
export const getMyConsultations = () =>
  apiClient.get('/api/customer/consultations').then((res) => res.data.data);

// PUT /api/customer/consultations/{consultationId} — 대기 중(REQUESTED)인 본인 상담 신청 수정
export const updateConsultation = (consultationId, payload) =>
  apiClient.put(`/api/customer/consultations/${consultationId}`, payload).then((res) => res.data.data);

// POST /api/customer/consultations/{consultationId}/cancel — 대기 중(REQUESTED)인 본인 상담 신청 취소
export const cancelConsultation = (consultationId) =>
  apiClient.post(`/api/customer/consultations/${consultationId}/cancel`).then((res) => res.data.data);

// GET /api/exhibitor/consultations — 참가업체: 본인 부스로 들어온 상담 신청 목록
export const getExhibitorConsultations = () =>
  apiClient.get('/api/exhibitor/consultations').then((res) => res.data.data);

// POST /api/exhibitor/consultations/{consultationId}/approve — 상담 신청 승인
export const approveConsultation = (consultationId) =>
  apiClient.post(`/api/exhibitor/consultations/${consultationId}/approve`).then((res) => res.data.data);

// POST /api/exhibitor/consultations/{consultationId}/reject — 상담 신청 반려 (사유 필수)
export const rejectConsultation = (consultationId, reason) =>
  apiClient
    .post(`/api/exhibitor/consultations/${consultationId}/reject`, { reason })
    .then((res) => res.data.data);

// POST /api/exhibitor/consultations/{consultationId}/complete — 방문 예정일 다음날부터: 승인된 상담 완료 처리
export const completeConsultation = (consultationId) =>
  apiClient.post(`/api/exhibitor/consultations/${consultationId}/complete`).then((res) => res.data.data);

// POST /api/exhibitor/consultations/{consultationId}/no-show — 방문 예정일 다음날부터: 승인된 상담 미방문 처리
export const markConsultationNoShow = (consultationId) =>
  apiClient.post(`/api/exhibitor/consultations/${consultationId}/no-show`).then((res) => res.data.data);
