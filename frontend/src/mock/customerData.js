// 일반 사용자(방문객)용 화면에서 쓰는 상수·헬퍼. 박람회/티켓 목록 자체는 전부 실제 API 기반이고
// (mockCustomerExpos/getMyTickets 등 과거 localStorage mock은 실제 연동 완료 후 죽은 코드라 삭제함,
// 2026-09-15 — features.md 트러블슈팅 로그 #2와 같은 종류의 잔존 mock 전수 검색 중 발견),
// 여기 남은 건 화면 표시용 상수와 실제 티켓 데이터를 받아 가공하는 순수 함수뿐이다.

export const CUSTOMER_EXPO_GRADIENTS = [
  'linear-gradient(135deg, #1e293b, #0f172a)',
  'linear-gradient(135deg, #7f1d1d, #1f2937)',
  'linear-gradient(135deg, #0e7490, #0f172a)',
];

export const CONSULTATION_TIME_SLOTS = [
  '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00',
];

// 환불 신청 모달의 환불 사유 드롭다운 옵션. 값은 그대로 백엔드에 문자열로 저장됨(별도 enum 없음) —
// ConsultationReject 등 기존 "사유" 필드들과 동일하게 자유 문자열로 취급.
export const REFUND_REASONS = [
  { value: '단순 변심', label: '단순 변심' },
  { value: '일정 변경', label: '일정 변경' },
  { value: '중복 결제', label: '중복 결제' },
  { value: '기타', label: '기타' },
];

export function toDisplayTicket(apiTicket, expoMap, holderName) {
  const expo = expoMap?.get(apiTicket.expoId) ?? null;
  return {
    id: `ticket-${apiTicket.ticketId}`,
    ticketId: apiTicket.ticketId,
    expoId: apiTicket.expoId,
    expoTitle: expo?.title ?? `박람회 #${apiTicket.expoId}`,
    startsAt: expo?.startsAt ?? null,
    endsAt: expo?.endsAt ?? null,
    venue: expo?.venue ?? '-',
    visitDate: apiTicket.visitDate,
    holderName: holderName ?? '-',
    ticketType: apiTicket.ticketType === 'PAID' ? '유료 입장권 · 1인' : '무료 방문예약 · 1인',
    isPaid: apiTicket.ticketType === 'PAID',
    bookingNo: `TICKET-${apiTicket.ticketId}`,
    purchasedAt: apiTicket.issuedAt ? apiTicket.issuedAt.replace('T', ' ').slice(0, 16) : '',
    usedAt: apiTicket.status === 'USED' ? apiTicket.issuedAt : null,
    status: apiTicket.status,
    qrImageBase64: apiTicket.qrImageBase64,
  };
}

// CANCELLED(환불 완료)를 usedAt/만료보다 먼저 확인.
// 상태는 박람회 전체 기간(endsAt)이 아니라 "이 티켓의 방문일(visitDate)" 기준으로 판단한다 —
// 입장권은 하루짜리 QR이라 방문일이 지나면 그날치는 못 쓰고(만료), 아직 방문일이 안 왔으면 사용예정으로 구분한다.
export function getTicketStatus(ticket) {
  if (ticket.status === 'CANCELLED') return '환불';
  if (ticket.usedAt) return '사용완료';
  if (ticket.visitDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const visit = new Date(ticket.visitDate);
    visit.setHours(0, 0, 0, 0);
    if (visit.getTime() < today.getTime()) return '만료';
    if (visit.getTime() > today.getTime()) return '사용예정';
  }
  return '사용가능';
}

// "..." 메뉴에 환불 신청을 보여줄지 판단하는 화면단 체크(실제 권한/최종 판정은 항상 백엔드가 함).
export function isTicketRefundable(ticket) {
  if (!ticket.isPaid) return false;
  if (ticket.status !== 'ISSUED') return false;
  if (!ticket.visitDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const visit = new Date(ticket.visitDate);
  visit.setHours(0, 0, 0, 0);
  return visit.getTime() >= today.getTime();
}

export function isTicketCheckableToday(ticket) {
  if (!ticket.visitDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const visit = new Date(ticket.visitDate);
  visit.setHours(0, 0, 0, 0);
  return visit.getTime() === today.getTime();
}

