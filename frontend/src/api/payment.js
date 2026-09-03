import apiClient from "./client";
import { getUserId } from "./auth";

// POST /api/exhibitor/payments - 부스 참가비 결제 (게이트웨이 경유)
// bookingId = 신청 그룹 id. amount = payment-context의 결제 대상 합계와 정확히 일치해야 함.
// Mock 게이트웨이 흐름이라 paymentId는 임의 문자열.
export const payGroup = ({ groupId, amount, payMethod }) =>
  apiClient
    .post("/api/exhibitor/payments", {
      bookingId: groupId,
      userId: getUserId(),
      amount,
      payMethod,
      paymentId: `demo-${Date.now()}`,
    })
    .then((res) => res.data);
