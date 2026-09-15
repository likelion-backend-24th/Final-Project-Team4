package com.team4.expo.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.expo.client.CustomerContact;
import com.team4.expo.client.IdentityClient;
import com.team4.expo.client.ReservationClient;
import com.team4.expo.client.TicketResolveResult;
import com.team4.expo.domain.ApplicationStatus;
import com.team4.expo.domain.Booth;
import com.team4.expo.domain.Consultation;
import com.team4.expo.domain.ConsultationStatus;
import com.team4.expo.domain.Lead;
import com.team4.expo.dto.LeadResponse;
import com.team4.expo.repository.BoothApplicationRepository;
import com.team4.expo.repository.BoothRepository;
import com.team4.expo.repository.ConsultationRepository;
import com.team4.expo.repository.LeadRepository;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 참가업체가 부스에서 고객 QR을 스캔해 리드(연락처)를 확보 (TASK 11-2).
@Service
@Transactional
public class LeadService {

    private final LeadRepository leadRepository;
    private final BoothRepository boothRepository;
    private final BoothApplicationRepository boothApplicationRepository;
    private final ConsultationRepository consultationRepository;
    private final ReservationClient reservationClient;
    private final IdentityClient identityClient;

    public LeadService(LeadRepository leadRepository, BoothRepository boothRepository,
                        BoothApplicationRepository boothApplicationRepository,
                        ConsultationRepository consultationRepository,
                        ReservationClient reservationClient, IdentityClient identityClient) {
        this.leadRepository = leadRepository;
        this.boothRepository = boothRepository;
        this.boothApplicationRepository = boothApplicationRepository;
        this.consultationRepository = consultationRepository;
        this.reservationClient = reservationClient;
        this.identityClient = identityClient;
    }

    public LeadResponse scanLead(Long exhibitorId, Long boothId, String qrToken) {
        Booth booth = findOwnedBooth(exhibitorId, boothId);

        // 유효하지 않은/만료 QR은 reservationClient가 NOT_FOUND(404)로 던짐.
        // Reservation 조회 자체가 실패/타임아웃이면 DEPENDENCY_TIMEOUT(202)로 던져 리드를 만들지 않는다(fail-closed).
        TicketResolveResult ticket = reservationClient.resolveTicket(qrToken);

        if (!ticket.expoId().equals(booth.getExpo().getId())) {
            throw new CustomException(ErrorCode.INVALID_STATE, "다른 박람회의 QR입니다.");
        }

        // 같은 QR(=같은 customerId+boothId) 재스캔이면 새로 만들지 않고 기존 리드를 그대로 반환(멱등)
        Lead existing = leadRepository.findByBooth_IdAndCustomerId(boothId, ticket.customerId()).orElse(null);
        if (existing != null) {
            return LeadResponse.from(existing);
        }

        // 사전 상담 신청(APPROVED + leadConsent 동의) 없이는 워크인 QR 스캔으로 리드를 만들 수 없음(2026-09-14 확정)
        Consultation consultation = consultationRepository
                .findByCustomerIdAndBooth_IdAndPreferredDateAndStatus(
                        ticket.customerId(), boothId, ticket.visitDate(), ConsultationStatus.APPROVED)
                .filter(Consultation::isLeadConsent)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_STATE,
                        "리드 확보에 동의한 승인된 상담 신청이 없습니다."));

        CustomerContact contact = identityClient.getCustomerContact(ticket.customerId())
                .orElse(new CustomerContact(consultation.getCustomerName(), consultation.getCustomerEmail()));

        // interestNote는 현장 상담 내용(자유 텍스트) - TASK 11-3(POST .../leads/{leadId}/summary)에서 채움. 생성 시점엔 비워둠.
        Lead lead = new Lead(booth, ticket.customerId(), consultation,
                contact.name(), contact.email(), null);
        return LeadResponse.from(leadRepository.save(lead));
    }

    @Transactional(readOnly = true)
    public List<LeadResponse> listForBooth(Long exhibitorId, Long boothId) {
        findOwnedBooth(exhibitorId, boothId);
        return leadRepository.findByBooth_IdOrderByCreatedAtDesc(boothId).stream()
                .map(LeadResponse::from)
                .collect(Collectors.toList());
    }

    private Booth findOwnedBooth(Long exhibitorId, Long boothId) {
        Booth booth = boothRepository.findById(boothId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "부스를 찾을 수 없습니다."));

        boolean owns = boothApplicationRepository.findByExhibitorIdAndStatus(exhibitorId, ApplicationStatus.CONFIRMED)
                .stream()
                .anyMatch(application -> application.getBooth().getId().equals(boothId));
        if (!owns) {
            throw new CustomException(ErrorCode.FORBIDDEN, "본인 부스의 리드만 다룰 수 있습니다.");
        }

        return booth;
    }
}
