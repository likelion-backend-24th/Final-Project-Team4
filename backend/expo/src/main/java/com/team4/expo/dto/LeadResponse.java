package com.team4.expo.dto;

import com.team4.expo.domain.Lead;
import java.time.LocalDateTime;

public record LeadResponse(
        Long id,
        Long boothId,
        Long customerId,
        Long consultationId,
        String customerName,
        String customerEmail,
        String interestNote,
        String emailSummary,
        String status,
        LocalDateTime createdAt
) {
    public static LeadResponse from(Lead lead) {
        return new LeadResponse(
                lead.getId(),
                lead.getBooth().getId(),
                lead.getCustomerId(),
                lead.getConsultation() != null ? lead.getConsultation().getId() : null,
                lead.getCustomerName(),
                lead.getCustomerEmail(),
                lead.getInterestNote(),
                lead.getEmailSummary(),
                lead.getStatus().name(),
                lead.getCreatedAt());
    }
}
