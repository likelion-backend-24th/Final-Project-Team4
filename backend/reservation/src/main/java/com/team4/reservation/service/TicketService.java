package com.team4.reservation.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.reservation.client.ExpoClient;
import com.team4.reservation.client.ExpoInfo;
import com.team4.reservation.domain.Ticket;
import com.team4.reservation.domain.TicketType;
import com.team4.reservation.dto.AdmissionContextResponse;
import com.team4.reservation.dto.TicketExistsResponse;
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

    // 사용자가 박람회 방문을 예약하며 날짜를 고르면 호출됨. 날짜 하나당 티켓 하나씩, 각각 멱등
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

        LocalDate periodStart = expo.startsAt().toLocalDate();
        LocalDate periodEnd = expo.endsAt().toLocalDate();
        visitDates.stream()
                .distinct()
                .filter(visitDate -> visitDate.isBefore(periodStart) || visitDate.isAfter(periodEnd))
                .findFirst()
                .ifPresent(invalidDate -> {
                    throw new CustomException(ErrorCode.VALIDATION_ERROR,
                            "방문 날짜는 박람회 기간(" + periodStart + "~" + periodEnd + ") 안이어야 합니다.");
                });

        List<TicketResponse> tickets = visitDates.stream()
                .distinct() // 같은 날짜를 중복 제출해도 티켓 중복 생성 안 되게 방어
                .map(visitDate -> issueOrGetTicket(customerId, expoId, visitDate))
                .toList();

        return new VisitApplicationResponse(expoId, tickets);
    }

    // Payment -> Reservation. 당일 유료 입장권 결제 전에 호출. "오늘" 날짜로 이 박람회 무료 QR을 이미 가진
    // 고객이면 결제 스킵, 아니면 Expo가 등록해둔 당일 입장료를 그대로 돌려준다.
    public AdmissionContextResponse getAdmissionContext(Long customerId, Long expoId) {
        ExpoInfo expo = expoClient.getExpo(expoId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "박람회를 찾을 수 없습니다."));

        boolean hasFreeAdmission = ticketRepository.existsByCustomerIdAndExpoIdAndTicketTypeAndVisitDate(
                customerId, expoId, TicketType.FREE, LocalDate.now());

        return new AdmissionContextResponse(expoId, customerId, hasFreeAdmission, expo.admissionFee());
    }

    // Expo -> Reservation. 상담 신청 접수 시점에 "이 고객이 이 박람회 이 날짜 입장권을 갖고 있는지"만 확인.
    // 티켓 타입(FREE/PAID)·상태(ISSUED/USED) 무관 — 그 날짜에 티켓이 존재하기만 하면 true.
    public TicketExistsResponse hasTicketForDate(Long customerId, Long expoId, LocalDate visitDate) {
        boolean hasTicket = ticketRepository.findByCustomerIdAndExpoIdAndVisitDate(customerId, expoId, visitDate)
                .isPresent();
        return new TicketExistsResponse(hasTicket);
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

    // 마이페이지 "나의 입장권" 목록 조회
    public List<TicketResponse> listMyTickets(Long customerId) {
        return ticketRepository.findByCustomerIdOrderByIssuedAtDesc(customerId).stream()
                .map(TicketResponse::from)
                .toList();
    }

    // Payment -> Reservation. 당일 유료 입장권 결제 완료 직후 호출 — "당일"권이므로 visitDate는 오늘이어야 한다.
    // 멱등 처리는 기존 티켓이 PAID일 때만(같은 결제 발급 호출의 재시도)
    public TicketResponse issueAdmissionTicket(Long customerId, Long expoId, LocalDate visitDate) {
        if (!visitDate.isEqual(LocalDate.now())) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "당일 입장권은 오늘 날짜로만 발급할 수 있습니다.");
        }

        return ticketRepository.findByCustomerIdAndExpoIdAndVisitDate(customerId, expoId, visitDate)
                .map(existing -> {
                    if (existing.getTicketType() != TicketType.PAID) {
                        throw new CustomException(ErrorCode.INVALID_STATE,
                                "이미 해당 날짜에 무료 입장권이 발급되어 있습니다.");
                    }
                    return TicketResponse.from(existing);
                })
                .orElseGet(() -> createPaidTicket(customerId, expoId, visitDate));
    }

    private TicketResponse createPaidTicket(Long customerId, Long expoId, LocalDate visitDate) {
        try {
            Ticket ticket = ticketRepository.save(Ticket.issuePaid(customerId, expoId, visitDate));
            return TicketResponse.from(ticket);
        } catch (DataIntegrityViolationException e) {
            return ticketRepository.findByCustomerIdAndExpoIdAndVisitDate(customerId, expoId, visitDate)
                    .map(TicketResponse::from)
                    .orElseThrow(() -> new CustomException(ErrorCode.INTERNAL_ERROR, "입장권 발급 처리 중 오류가 발생했습니다."));
        }
    }
}
