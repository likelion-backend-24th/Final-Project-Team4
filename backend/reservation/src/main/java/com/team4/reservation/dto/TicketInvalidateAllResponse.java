package com.team4.reservation.dto;

// Identity -> Reservation 회원 탈퇴 시 티켓 전체 무효화 요청의 응답.
// invalidatedCount = 실제로 CANCELLED 처리된 티켓 수(이미 USED였던 건 포함 안 됨)
public record TicketInvalidateAllResponse (int invalidateCount){
}
