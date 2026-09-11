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

// POST /api/customer/admission-payments - 당일 유료 입장권 결제 (무료 QR 입장권이 없는 방문객 대상)
// 결제 대상 고객은 Gateway가 JWT에서 꺼내 X-User-Id로 주입 - body로 customerId를 보내지 않음(서버가 안 받음)
export const payAdmission = ({ expoId, amount, payMethod, paymentId }) =>
  apiClient
    .post("/api/customer/admission-payments", {
      expoId,
      amount,
      payMethod,
      paymentId,
    })
    .then((res) => res.data);