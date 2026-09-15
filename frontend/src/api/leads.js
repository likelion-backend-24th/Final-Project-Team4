import apiClient from './client';

// 백엔드는 상태를 NEW/SENT 2가지만 준다(TASK 11-2~4). 화면은 원래 Mock 때부터 SCANNED/DRAFTED/SENT
// 3단계 배지를 썼으므로, emailSummary 존재 여부로 SCANNED/DRAFTED를 여기서 나눠 기존 화면(LeadCapture.jsx)을
// 그대로 둔다. leadId도 화면이 쓰는 키 이름 그대로 맞춤(백엔드 응답 필드는 id).
const mapLead = (lead) => ({
  leadId: lead.id,
  boothId: lead.boothId,
  customerId: lead.customerId,
  consultationId: lead.consultationId,
  customerName: lead.customerName,
  customerEmail: lead.customerEmail,
  interestNote: lead.interestNote,
  emailSummary: lead.emailSummary,
  status: lead.status === 'SENT' ? 'SENT' : lead.emailSummary ? 'DRAFTED' : 'SCANNED',
  createdAt: lead.createdAt,
});

// GET /api/exhibitor/booths/mine — 참가 확정된 본인 부스 목록(QR 리드 화면의 부스 선택 드롭다운용)
export const getMyBooths = () => apiClient.get('/api/exhibitor/booths/mine').then((res) => res.data.data);

// POST /api/exhibitor/booths/{boothId}/leads — Body { qrToken }
// 같은 QR 재스캔은 기존 리드를 그대로 반환(멱등), 동의 없는/워크인/타 박람회 QR은 409, 만료 QR은 404,
// Reservation 조회 실패는 202 — 전부 apiClient 인터셉터가 err.response.data.error.message로 정리해줌.
export const scanLeadQr = (boothId, qrToken) =>
  apiClient.post(`/api/exhibitor/booths/${boothId}/leads`, { qrToken }).then((res) => mapLead(res.data.data));

// GET /api/exhibitor/booths/{boothId}/leads
export const getLeads = (boothId) =>
  apiClient.get(`/api/exhibitor/booths/${boothId}/leads`).then((res) => res.data.data.map(mapLead));

// POST /api/exhibitor/leads/{leadId}/summary — Body { consultationNote }. 이 시점엔 메일 발송 안 됨(미리보기).
export const summarizeLeadEmail = (leadId, consultationNote) =>
  apiClient
    .post(`/api/exhibitor/leads/${leadId}/summary`, { consultationNote })
    .then((res) => mapLead(res.data.data));

// POST /api/exhibitor/leads/{leadId}/send-info — Body { emailBody }
export const sendLeadInfo = (leadId, emailBody) =>
  apiClient.post(`/api/exhibitor/leads/${leadId}/send-info`, { emailBody }).then((res) => mapLead(res.data.data));
