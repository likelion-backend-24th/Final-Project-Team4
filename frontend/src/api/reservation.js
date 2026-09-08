import apiClient from './client';

// POST /api/customer/reservations — 박람회 방문 예약 신청(날짜별 QR 발급). USER 역할만 허용.
// payload: { expoId, visitDates: ['2026-05-12', ...] }
export const applyVisit = (payload) =>
  apiClient.post('/api/customer/reservations', payload).then((res) => res.data.data);

// GET /api/customer/reservations — 내가 발급받은 입장권 목록 조회 (최근 발급 순)
export const getMyReservations = () =>
  apiClient.get('/api/customer/reservations').then((res) => res.data.data);

// POST /api/customer/reservations/{ticketId}/check-in — 셀프 체크인.
// 본인 소유 + 방문 예약일이 오늘일 때만 성공(그 외 403/409).
export const checkInReservation = (ticketId) =>
  apiClient.post(`/api/customer/reservations/${ticketId}/check-in`).then((res) => res.data.data);
