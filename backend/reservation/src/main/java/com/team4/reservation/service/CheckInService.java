package com.team4.reservation.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.reservation.domain.CheckIn;
import com.team4.reservation.domain.Ticket;
import com.team4.reservation.dto.CheckInResponse;
import com.team4.reservation.repository.CheckInRepository;
import com.team4.reservation.repository.TicketRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CheckInService {

    private final TicketRepository ticketRepository;
    private final CheckInRepository checkInRepository;

    // 고객이 앱에서 본인 QR로 셀프 체크인.
    // 본인 소유 티켓인지, 방문 예약일이 오늘인지까지 확인한 뒤 원자적 단일 사용 처리를 탄다.
    @Transactional
    public CheckInResponse selfCheckIn(Long customerId, Long ticketId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "존재하지 않는 입장권입니다."));

        if (!ticket.getCustomerId().equals(customerId)) {
            throw new CustomException(ErrorCode.FORBIDDEN, "본인의 입장권만 체크인할 수 있습니다.");
        }
        if (!ticket.getVisitDate().isEqual(LocalDate.now())) {
            throw new CustomException(ErrorCode.INVALID_STATE, "방문 예약일에만 입장 체크가 가능합니다.");
        }

        LocalDateTime now = LocalDateTime.now();
        int updated = ticketRepository.markUsedIfIssued(ticket.getId(), now);
        if (updated == 0) {
            throw new CustomException(ErrorCode.INVALID_STATE, "이미 사용되었거나 취소된 QR입니다.");
        }

        checkInRepository.save(new CheckIn(ticket.getId(), ticket.getExpoId(), now));

        return new CheckInResponse(ticket.getId(), ticket.getCustomerId(), ticket.getExpoId(), now);
    }
}
