import apiClient from './client';

// GET /api/expos — 아직 백엔드에 없음, 구현되는 대로 응답 스키마 맞출 것
export const getExpoList = () => apiClient.get('/api/expos').then((res) => res.data.data);

// GET /api/expos/{expoId} — 아직 백엔드에 없음
export const getExpoDetail = (expoId) =>
  apiClient.get(`/api/expos/${expoId}`).then((res) => res.data.data);

// POST /api/exhibitor/booth-applications — 구현되어 있음
export const applyBooth = (payload) =>
  apiClient
    .post('/api/exhibitor/booth-applications', payload)
    .then((res) => res.data.data);
