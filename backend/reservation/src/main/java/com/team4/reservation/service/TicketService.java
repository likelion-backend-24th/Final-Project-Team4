package com.team4.reservation.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.reservation.client.ExpoClient;
import com.team4.reservation.client.ExpoInfo;
import com.team4.reservation.domain.Ticket;
import com.team4.reservation.domain.TicketType;
import com.team4.reservation.dto.AdmissionContextResponse;
import com.team4.reservation.dto.TicketResponse;
import com.team4.reservation.dto.VisitApplicationResponse;
import com.team4.reservation.repository.TicketRepository;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;
    private final ExpoClient expoClient;

    // 사용자가 박람회 방문을 예약하며 날짜(들)를 고르면 호출됨. 날짜 하나당 티켓 하나씩, 각각 멱등 —
    // 이미 그 날짜 티켓이 있으면 새로 만들지 않고 기존 걸 그대로 돌려준다.
    public VisitApplicationResponse applyVisit(Long customerId, Long expoId, List<LocalDate> visitDates) {
        ExpoInfo expo = expoClient.getExpo(expoId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "박람회를 찾을 수 없습니다."));

        if (!expo.isOpen()) {
            throw new CustomException(ErrorCode.INVALID_STATE, "공개되지 않은 박람회입니다.");
        }
        if (!LocalDate.now().isBefore(expo.startsAt().toLocalDate())) {
            throw new CustomException(ErrorCode.INVALID_STATE,
                    "박람회 시작 이후 신청은 무료로 제공되지 않습니다. 당일 유료 입장권은 아직 지원되지 않습니다.");
        }

        List<TicketResponse> tickets = visitDates.stream()
                .distinct() // 같은 날짜를 중복 제출해도 티켓 중복 생성 안 되게 방어
                .map(visitDate -> issueOrGetTicket(customerId, expoId, visitDate))
                .toList();

        return new VisitApplicationResponse(expoId, tickets);
    }

    // Payment -> Reservation. 당일 유료 입장권 결제 전에 호출. 이미 이 박람회 무료 QR을 가진 고객이면
    // hasFreeAdmission=true(결제 스킵), 아니면 Expo가 등록해둔 당일 입장료를 그대로 돌려준다.
    public AdmissionContextResponse getAdmissionContext(Long customerId, Long expoId) {
        ExpoInfo expo = expoClient.getExpo(expoId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "박람회를 찾을 수 없습니다."));

        boolean hasFreeAdmission = ticketRepository.existsByCustomerIdAndExpoIdAndTicketType(
                customerId, expoId, TicketType.FREE);

        return new AdmissionContextResponse(expoId, customerId, hasFreeAdmission, expo.admissionFee());
    }

    private TicketResponse issueOrGetTicket(Long customerId, Long expoId, LocalDate visitDate) {
        return ticketRepository.findByCustomerIdAndExpoIdAndVisitDate(customerId, expoId, visitDate)
                .map(TicketResponse::from)
                .orElseGet(() -> createTicket(customerId, expoId, visitDate));
    }

    private TicketResponse createTicket(Long customerId, Long expoId, LocalDate visitDate) {
        try {
            Ticket ticket = ticketRepository.save(Ticket.issueFree(customerId, expoId, visitDate));
            return TicketResponse.from(ticket);
        } catch (DataIntegrityViolationException e) {
            // 동시 요청으로 unique(customer_id, expo_id, visit_date) 제약에 걸린 경우 — 이미 발급된 걸로 간주하고 그걸 반환.
            return ticketRepository.findByCustomerIdAndExpoIdAndVisitDate(customerId, expoId, visitDate)
                    .map(TicketResponse::from)
                    .orElseThrow(() -> new CustomException(ErrorCode.INTERNAL_ERROR, "입장권 발급 처리 중 오류가 발생했습니다."));
        }
    }
}
