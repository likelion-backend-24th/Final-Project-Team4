import apiClient from './client';

// POST /api/customer/reservations — 박람회 방문 예약 신청(날짜별 QR 발급). USER 역할만 허용.
// payload: { expoId, visitDates: ['2026-05-12', ...] }
export const applyVisit = (payload) =>
  apiClient.post('/api/customer/reservations', payload).then((res) => res.data.data);
