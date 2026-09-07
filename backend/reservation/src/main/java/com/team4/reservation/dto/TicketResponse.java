package com.team4.reservation.dto;

import com.team4.reservation.domain.Ticket;
import com.team4.reservation.domain.TicketStatus;
import com.team4.reservation.domain.TicketType;
import com.team4.reservation.qrcode.QrCodeGenerator;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Getter;

// 입장권 발급/조회 공통 응답
@Getter
public class TicketResponse {

    private final Long ticketId;
    private final Long customerId;
    private final Long expoId;
    private final LocalDate visitDate;
    private final TicketType ticketType;
    private final TicketStatus status;
    private final String qrToken; // 원본 토큰 문자열. 체크인 API(qrToken 파라미터)에 그대로 넘기면 됨.
    // data:image/png;base64,... 없이 순수 base64만. 프론트에서 <img src="data:image/png;base64,{qrImageBase64}">로 렌더링.
    private final String qrImageBase64;
    private final LocalDateTime issuedAt;

    public TicketResponse(Long ticketId, Long customerId, Long expoId, LocalDate visitDate, TicketType ticketType,
                           TicketStatus status, String qrToken, String qrImageBase64, LocalDateTime issuedAt) {
        this.ticketId = ticketId;
        this.customerId = customerId;
        this.expoId = expoId;
        this.visitDate = visitDate;
        this.ticketType = ticketType;
        this.status = status;
        this.qrToken = qrToken;
        this.qrImageBase64 = qrImageBase64;
        this.issuedAt = issuedAt;
    }

    // QR 이미지를 DB에 저장하지 않고 응답할 때마다 qrToken으로부터 즉석에서 다시 그림
    public static TicketResponse from(Ticket ticket) {
        return new TicketResponse(
                ticket.getId(),
                ticket.getCustomerId(),
                ticket.getExpoId(),
                ticket.getVisitDate(),
                ticket.getTicketType(),
                ticket.getStatus(),
                ticket.getQrToken(),
                QrCodeGenerator.toBase64Png(ticket.getQrToken()),
                ticket.getIssuedAt()
        );
    }
}
