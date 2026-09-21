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

// POST /api/admin/expos/{expoId}/close — Admin: 박람회 비공개 전환 (OPEN → DRAFT, 신청 있으면 실패)
export const closeExpo = (expoId) =>
  apiClient.post(`/api/admin/expos/${expoId}/close`).then((res) => res.data.data);

// GET /api/admin/expos/{expoId} — Admin: 박람회 단건 조회 (수정 화면 진입용)
export const getAdminExpo = (expoId) =>
  apiClient.get(`/api/admin/expos/${expoId}`).then((res) => res.data.data);

// PUT /api/admin/expos/{expoId} — Admin: 박람회 정보 수정 (부스 목록은 대상 아님)
export const updateExpo = (expoId, payload) =>
  apiClient.put(`/api/admin/expos/${expoId}`, payload).then((res) => res.data.data);

// PUT /api/admin/expos/{expoId}/banner-image — Admin: 박람회 배너 이미지 등록/교체
export const uploadExpoBannerImage = (expoId, file) => {
  const formData = new FormData();
  formData.append('image', file);
  return apiClient
    .put(`/api/admin/expos/${expoId}/banner-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data.data);
};

// DELETE /api/admin/expos/{expoId} — Admin: 박람회 삭제 (DRAFT + 신청 0건일 때만 가능)
export const deleteExpo = (expoId) =>
  apiClient.delete(`/api/admin/expos/${expoId}`).then((res) => res.data.data);

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

// GET /api/customer/expos/{expoId}/visited-booths - 로그인 고객이 QR 스캔으로 방문 기록을 남긴 부스 목록 (로그인 필요)
export const getVisitedBooths = (expoId) =>
  apiClient.get(`/api/customer/expos/${expoId}/visited-booths`).then((res) => res.data.data);

// GET /api/exhibitor/booths/{boothId} — 참가 확정 부스 관리 정보(부스 정보 + 콘텐츠 + 배너) 조회
export const getBoothManageDetail = (boothId) =>
  apiClient.get(`/api/exhibitor/booths/${boothId}`).then((res) => res.data.data);

// GET /api/exhibitor/booths/{boothId}/consultation-slots — 상담 접수 정원 설정 조회
// 응답: { defaultCapacity, slots: [{ date: 'YYYY-MM-DD', time: 'HH:mm:ss', capacity }] } (슬롯별로 덮어쓴 값만)
export const getConsultationSlotSettings = (boothId) =>
  apiClient.get(`/api/exhibitor/booths/${boothId}/consultation-slots`).then((res) => res.data.data);

// PUT /api/exhibitor/booths/{boothId}/consultation-slots — 상담 접수 정원 저장(기존 슬롯별 설정을 통째로 교체)
// payload: { defaultCapacity, slots: [{ date, time, capacity }] }
export const saveConsultationSlotSettings = (boothId, payload) =>
  apiClient.put(`/api/exhibitor/booths/${boothId}/consultation-slots`, payload).then((res) => res.data.data);

// GET /api/customer/consultations/booths/{boothId}/slots?date= — 그 날짜의 시간대별 정원/신청 건수
// 응답: { defaultCapacity, slots: [{ time: 'HH:mm:ss', capacity, booked }] } — 목록에 없는 시간대는 defaultCapacity, 신청 0건
export const getConsultationSlotAvailability = (boothId, date) =>
  apiClient.get(`/api/customer/consultations/booths/${boothId}/slots`, { params: { date } }).then((res) => res.data.data);

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

// GET /api/exhibitor/booths/{boothId}/stats — 부스 상담 상태별 건수 + 방문자(Lead) 수
export const getBoothStats = (boothId) =>
  apiClient.get(`/api/exhibitor/booths/${boothId}/stats`).then((res) => res.data.data);

// GET /api/exhibitor/booths/{boothId}/reviews — 본인 부스로 들어온 후기(상담후기+부스후기) 실명 조회
export const getExhibitorBoothReviews = (boothId) =>
  apiClient.get(`/api/exhibitor/booths/${boothId}/reviews`).then((res) => res.data.data);

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

// POST /api/exhibitor/booths/{boothId}/vehicles/analyze-image — 차량 사진(정면/측면/후면 등 1~3장)을
// AI(Gemini)로 함께 분석해 이름/브랜드/배터리/주행거리 등 스펙 초안을 돌려줌 (DB 저장 없음, 폼 자동입력 용도).
// files: File[] (최소 1장 필수, 최대 3장) — 여러 각도를 함께 보내면 인식 정확도가 올라간다.
// 응답: { analyzed, name, brand, category, tags, summary, description, features, colors,
//         range, battery, power, drivetrain, chargingType, chargingTime, dimensions, weight, seatingCapacity }
// 이미지가 아예 없으면 400 에러, 그 외 분석 실패는 analyzed:false로 정상 응답하므로
// 호출부에서 analyzed 값만 보고 그대로 폼에 반영하면 됨. 사진을 바꿔서 다시 호출하면(재분석) 매번 새로 분석함.
export const analyzeVehicleImage = (boothId, files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('images', file));
  return apiClient
    .post(`/api/exhibitor/booths/${boothId}/vehicles/analyze-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data.data);
};

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

// POST /api/customer/consultations/{consultationId}/review-draft — AI 후기 초안 생성
// payload: { reviewType: 'CONSULT' | 'BOOTH', vehicleName? } / 응답: { draft: string | null }
export const draftConsultationReview = (consultationId, payload) =>
  apiClient.post(`/api/customer/consultations/${consultationId}/review-draft`, payload).then((res) => res.data.data);

// GET /api/exhibitor/consultations — 참가업체: 본인 부스로 들어온 상담 신청 목록
export const getExhibitorConsultations = () =>
  apiClient.get('/api/exhibitor/consultations').then((res) => res.data.data);

// POST /api/exhibitor/consultations/{consultationId}/regenerate-summary — AI 요약 생성 실패(aiSummaryRetryable=true)한 상담 재시도
export const regenerateConsultationAiSummary = (consultationId) =>
  apiClient
    .post(`/api/exhibitor/consultations/${consultationId}/regenerate-summary`)
    .then((res) => res.data.data);

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

// POST /api/customer/consultations/review-polish — 고객이 쓴 후기 문장을 AI로 다듬기 (상담 건과 무관)
// payload: { reviewType: 'CONSULT' | 'BOOTH', vehicleName?, content } / 응답: { draft: string | null } (실패 시 null)
export const polishReviewContent = (payload) =>
  apiClient.post('/api/customer/consultations/review-polish', payload).then((res) => res.data.data);

// GET /api/customer/booths/{boothId}/reviews — 부스 후기(상담후기/부스후기) 목록 (비회원 조회 가능)
// 응답: { totalCount, consultReviews: ReviewResponse[], boothReviews: ReviewResponse[] }
export const getBoothReviews = (boothId) =>
  apiClient.get(`/api/customer/booths/${boothId}/reviews`).then((res) => res.data.data);

// POST /api/customer/booths/{boothId}/reviews — 후기 작성 (해당 부스 상담을 완료 후 5일 이내인 고객만 가능, 로그인 필요)
// payload: { reviewType: 'CONSULT' | 'BOOTH', vehicleName?, content }
export const createBoothReview = (boothId, payload) =>
  apiClient.post(`/api/customer/booths/${boothId}/reviews`, payload).then((res) => res.data.data);

// GET /api/customer/reviews/mine — 내가 작성한 후기 목록 (ReviewResponse[]: reviewId, boothId, reviewType, boothNo, vehicleName, content, createdAt, images)
export const getMyReviews = () => apiClient.get('/api/customer/reviews/mine').then((res) => res.data.data);

// PUT /api/customer/booths/{boothId}/reviews/{reviewId} — 본인 후기 수정 (유형 변경 불가, payload는 작성과 동일)
export const updateBoothReview = (boothId, reviewId, payload) =>
  apiClient.put(`/api/customer/booths/${boothId}/reviews/${reviewId}`, payload).then((res) => res.data.data);

// DELETE /api/customer/booths/{boothId}/reviews/{reviewId} — 본인 후기 삭제 (사진 포함)
export const deleteBoothReview = (boothId, reviewId) =>
  apiClient.delete(`/api/customer/booths/${boothId}/reviews/${reviewId}`);

// POST /api/customer/booths/{boothId}/reviews/{reviewId}/images — 후기 사진 추가 (최대 5장, 선택, 본인 후기만)
export const addBoothReviewImage = (boothId, reviewId, file) => {
  const formData = new FormData();
  formData.append('image', file);
  return apiClient
    .post(`/api/customer/booths/${boothId}/reviews/${reviewId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data.data);
};

// GET /api/customer/vehicles/search — 자연어 질의로 전시 차량 AI 검색 (전체 공개 박람회 대상)
// 응답: { interpretedSummary, results: [{ expoId, expoTitle, boothId, boothNo, companyName, vehicle }] }
export const searchVehicles = (query) =>
  apiClient
    .get('/api/customer/vehicles/search', { params: { query } })
    .then((res) => res.data.data);

// POST /api/admin/expos/description-draft — Admin: 박람회명(+장소)을 키워드로 행사 소개 문구 AI 초안 생성
export const draftExpoDescription = (payload) =>
  apiClient.post('/api/admin/expos/description-draft', payload).then((res) => res.data.data);