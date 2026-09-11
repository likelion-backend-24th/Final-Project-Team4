package com.team4.payment.client;

import java.time.LocalDate;

// Reservation이 결제 완료 후 발급한 티켓 정보. qrImageBase64는 순수 base64(접두어 없음).
public record AdmissionTicket(Long ticketId, LocalDate visitDate, String qrToken, String qrImageBase64) {
}
