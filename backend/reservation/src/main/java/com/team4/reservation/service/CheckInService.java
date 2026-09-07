package com.team4.reservation.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.reservation.domain.CheckIn;
import com.team4.reservation.domain.Ticket;
import com.team4.reservation.dto.CheckInResponse;
import com.team4.reservation.repository.CheckInRepository;
import com.team4.reservation.repository.TicketRepository;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CheckInService {

    private final TicketRepository ticketRepository;
    private final CheckInRepository checkInRepository;

    // 티켓은 방문 예약 시 특정 (expoId, visitDate)로 발급되므로, 체크인은 반드시 그 티켓이 발급된
    // 박람회에서만 성공해야 한다 — 다른 박람회 스캐너에 들이밀면 409.
    @Transactional
    public CheckInResponse checkIn(String qrToken, Long expoId) {
        // qrToken은 unique라 결과가 0건 아니면 항상 정확히 1건
        Ticket ticket = ticketRepository.findByQrToken(qrToken)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "존재하지 않는 QR입니다."));

        // 티켓이 발급된 박람회와 지금 찍으려는 박람회가 다르면, 상태 전이(ISSUED->USED)를 시도하기도 전에 차단.
        if (!ticket.getExpoId().equals(expoId)) {
            throw new CustomException(ErrorCode.INVALID_STATE, "다른 박람회의 QR입니다.");
        }

        LocalDateTime now = LocalDateTime.now();
        // status가 ISSUED일 때만 원자적으로 USED 전환 — 동시에 여러 요청이 와도 이 UPDATE는 한 번만 1행을 갱신한다.
        int updated = ticketRepository.markUsedIfIssued(ticket.getId(), now);
        if (updated == 0) {
            throw new CustomException(ErrorCode.INVALID_STATE, "이미 사용되었거나 취소된 QR입니다.");
        }

        checkInRepository.save(new CheckIn(ticket.getId(), expoId, now));

        return new CheckInResponse(ticket.getId(), ticket.getCustomerId(), expoId, now);
    }
}
