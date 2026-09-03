import axios from 'axios';

// 게이트웨이 라우팅 없이, 지금은 결제 서비스에 직접 요청 (포트 8083)
const paymentClient = axios.create({
  baseURL: import.meta.env.VITE_PAYMENT_API_BASE_URL ?? 'http://localhost:8083',
});

export const payBooking = ({ bookingId, userId, amount, payMethod }) =>
  paymentClient
    .post('/api/exhibitor/payments', { bookingId, userId, amount, payMethod })
    .then((res) => res.data);