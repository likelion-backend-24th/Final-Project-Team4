package com.team4.payment.client;

// Reservation이 당일 결제 완료 후 발급한 티켓 정보. qrImageBase64는 순수 base64(접두어 없음).
public record AdmissionTicket(Long ticketId, String qrToken, String qrImageBase64) {
}
