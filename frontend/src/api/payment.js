import apiClient from "./client";

// POST /api/exhibitor/payments - 부스 참가비 결제
// bookingId = 신청 그룹 id. amount = payment-context의 결제 대상 합계와 정확히 일치해야 함.
// paymentId = PortOne 결제창에서 실제로 처리된 결제 건의 고유 ID (프론트에서 미리 만들어서 넘긴 값)
export const payGroup = ({ groupId, amount, payMethod, paymentId }) =>
  apiClient
    .post("/api/exhibitor/payments", {
      bookingId: groupId,
      amount,
      payMethod,
      paymentId,
    })
    .then((res) => res.data);

// GET /api/exhibitor/payments - 로그인한 사용자의 결제 내역 전체 조회
// 사용자 식별은 Gateway가 JWT에서 꺼내 X-User-Id로 주입
// 마이페이지 "참가비 결제 내역" 표에서 사용
export const getMyPayments = () =>
  apiClient
    .get("/api/exhibitor/payments")
    .then((res) => res.data);

// POST /api/exhibitor/payments/{bookingId}/refund - 부스 참가비 전액 환불 신청
// 참가 확정(CONFIRMED, 결제완료)된 신청 그룹만 대상. 성공 시 부스 자리도 반납됨(ASSIGNED -> AVAILABLE)
export const refundBoothPayment = ({ bookingId, reason }) =>
  apiClient
    .post(`/api/exhibitor/payments/${bookingId}/refund`, { reason })
    .then((res) => res.data);

// POST /api/customer/admission-payments - 유료 입장권 결제 (무료 QR이 없는 날짜를 방문할 때).
// 무료 방문예약처럼 날짜를 여러 개 골라 한 번에 결제하면 그 수만큼 티켓이 각각 발급됨.
// 결제 대상 고객은 Gateway가 JWT에서 꺼내 X-User-Id로 주입 - body로 customerId를 보내지 않음(서버가 안 받음)
export const payAdmission = ({ expoId, visitDates, amount, payMethod, paymentId }) =>
  apiClient
    .post("/api/customer/admission-payments", {
      expoId,
      visitDates,
      amount,
      payMethod,
      paymentId,
    })
    .then((res) => res.data);

// GET /api/customer/admission-payments/tickets/{ticketId} - 특정 입장권(날짜 1건) 결제 상세 조회
// 마이페이지 "나의 입장권" > "..." 메뉴 > 결제 내역 보기 모달에서 사용
export const getAdmissionTicketPaymentDetail = (ticketId) =>
  apiClient
    .get(`/api/customer/admission-payments/tickets/${ticketId}`)
    .then((res) => res.data);

// POST /api/customer/admission-payments/tickets/{ticketId}/refund - 입장권 환불 신청
// 이미 체크인된 티켓, 방문일이 지난 티켓, 이미 환불된 티켓은 백엔드에서 409로 막힘
export const refundAdmissionTicket = ({ ticketId, reason }) =>
  apiClient
    .post(`/api/customer/admission-payments/tickets/${ticketId}/refund`, { reason })
    .then((res) => res.data);

// GET /api/admin/expos/{expoId}/revenue - 관리자: 박람회별 매출 현황(부스 참가비/당일 입장권 구분, 환불 차감 순매출)
export const getExpoRevenue = (expoId) =>
  apiClient.get(`/api/admin/expos/${expoId}/revenue`).then((res) => res.data);

// GET /api/admin/stats/payments - 관리자: 박람회별 일별 결제, 환불 통계(source별)
export const getPaymentStats = ({ expoId, from, to }) =>
  apiClient
    .get('/api/admin/stats/payments', { params: { expoId, from, to } })
    .then((res) => res.data);