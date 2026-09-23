package com.team4.expo.lead.dto;

import com.team4.expo.lead.domain.Lead;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record LeadResponse(
        Long id,
        Long boothId,
        Long customerId,
        Long consultationId,
        String customerName,
        String customerEmail,
        LocalDate visitDate,
        String interestNote,
        String emailSummary,
        boolean leadConsent,
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
                lead.getVisitDate(),
                lead.getInterestNote(),
                lead.getEmailSummary(),
                lead.isLeadConsent(),
                lead.getStatus().name(),
                lead.getCreatedAt());
    }
}
