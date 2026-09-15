package com.team4.expo.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.expo.client.AiSummaryClient;
import com.team4.expo.client.CustomerContact;
import com.team4.expo.client.ExhibitorProfile;
import com.team4.expo.client.IdentityClient;
import com.team4.expo.client.ReservationClient;
import com.team4.expo.client.TicketResolveResult;
import com.team4.expo.domain.ApplicationStatus;
import com.team4.expo.domain.Booth;
import com.team4.expo.domain.Consultation;
import com.team4.expo.domain.ConsultationStatus;
import com.team4.expo.domain.Lead;
import com.team4.expo.dto.LeadResponse;
import com.team4.expo.dto.MyBoothResponse;
import com.team4.expo.repository.BoothApplicationRepository;
import com.team4.expo.repository.BoothRepository;
import com.team4.expo.repository.ConsultationRepository;
import com.team4.expo.repository.LeadRepository;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 참가업체가 부스에서 고객 QR을 스캔해 리드(연락처)를 확보 (TASK 11-2), 현장 상담 메모를 이메일 초안으로 정리 (TASK 11-3).
@Service
@Transactional
public class LeadService {

    private final LeadRepository leadRepository;
    private final BoothRepository boothRepository;
    private final BoothApplicationRepository boothApplicationRepository;
    private final ConsultationRepository consultationRepository;
    private final ReservationClient reservationClient;
    private final IdentityClient identityClient;
    private final AiSummaryClient aiSummaryClient;

    public LeadService(LeadRepository leadRepository, BoothRepository boothRepository,
                        BoothApplicationRepository boothApplicationRepository,
                        ConsultationRepository consultationRepository,
                        ReservationClient reservationClient, IdentityClient identityClient,
                        AiSummaryClient aiSummaryClient) {
        this.leadRepository = leadRepository;
        this.boothRepository = boothRepository;
        this.boothApplicationRepository = boothApplicationRepository;
        this.consultationRepository = consultationRepository;
        this.reservationClient = reservationClient;
        this.identityClient = identityClient;
        this.aiSummaryClient = aiSummaryClient;
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

    // 참가업체가 QR 리드 화면에서 고를 본인 부스 목록(참가 확정된 부스만) - 화면의 부스 하드코딩을 대체(2026-09-15).
    // boothNo/expoTitle까지 화면에 보여줘야 해서 JOIN FETCH 버전을 쓴다(N+1 방지) - findByExhibitorIdAndStatus를
    // 그대로 쓰면 부스 수만큼 booth 쿼리가, expo까지 건드리면 또 그만큼 expo 쿼리가 추가로 나간다.
    @Transactional(readOnly = true)
    public List<MyBoothResponse> listMyBooths(Long exhibitorId) {
        return boothApplicationRepository
                .findWithBoothAndExpoByExhibitorIdAndStatus(exhibitorId, ApplicationStatus.CONFIRMED).stream()
                .map(application -> MyBoothResponse.from(application.getBooth()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<LeadResponse> listForBooth(Long exhibitorId, Long boothId) {
        findOwnedBooth(exhibitorId, boothId);
        return leadRepository.findByBooth_IdOrderByCreatedAtDesc(boothId).stream()
                .map(LeadResponse::from)
                .collect(Collectors.toList());
    }

    // 현장 상담 메모를 입력받아 Gemini로 고객용 이메일 본문 초안을 생성(TASK 11-3). 이 시점엔 발송하지 않음(미리보기).
    // Gemini 실패/타임아웃이면 fail-open - 메모 원문을 그대로 이메일 본문 후보로 저장.
    public LeadResponse generateEmailSummary(Long exhibitorId, Long leadId, String consultationNote) {
        Lead lead = findOwnedLead(exhibitorId, leadId);

        String emailBody = aiSummaryClient.summarizeForEmail(lead.getCustomerName(), consultationNote)
                .orElse(consultationNote);
        lead.recordEmailSummary(consultationNote, emailBody);

        return LeadResponse.from(lead);
    }

    // 참가업체가 확정한 이메일 본문을 고객에게 최종 발송(TASK 11-4). Identity 내부 API 호출 실패 시
    // 예외가 그대로 전파되어(fail-closed) 리드 상태를 바꾸지 않고 재시도 가능하게 둔다.
    public LeadResponse sendInfo(Long exhibitorId, Long leadId, String emailBody) {
        Lead lead = findOwnedLead(exhibitorId, leadId);

        identityClient.sendMail(lead.getCustomerEmail(), buildSendInfoSubject(exhibitorId, lead), emailBody);
        lead.markSent();

        // 발송 성공이 실제 상담 완료의 직접 증거이므로, 연결된 Consultation이 APPROVED면 방문 예정일과 무관하게
        // 바로 COMPLETED로 전이한다(기존 completeConsultation()의 "다음날부터" 날짜 게이트와 별개 경로, 2026-09-14 확정).
        Consultation consultation = lead.getConsultation();
        if (consultation != null && consultation.getStatus() == ConsultationStatus.APPROVED) {
            consultation.complete();
        }

        return LeadResponse.from(lead);
    }

    // 고객이 여러 박람회·여러 업체에서 상담을 받으면 메일 제목만 보고는 구분이 안 되던 문제(2026-09-15) -
    // 박람회명 + 참가업체명을 제목에 박아준다. 회사명 조회 실패 시엔 부스 번호로 대체(발송 자체는 막지 않음).
    private String buildSendInfoSubject(Long exhibitorId, Lead lead) {
        String expoTitle = lead.getBooth().getExpo().getTitle();
        String exhibitorLabel = identityClient.getExhibitorProfile(exhibitorId)
                .map(ExhibitorProfile::companyName)
                .filter(name -> name != null && !name.isBlank())
                .orElseGet(() -> lead.getBooth().getBoothNo() + " 부스");

        return "[" + expoTitle + "] " + exhibitorLabel + " 방문 상담 내용 정리 및 안내";
    }

    private Booth findOwnedBooth(Long exhibitorId, Long boothId) {
        Booth booth = boothRepository.findById(boothId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "부스를 찾을 수 없습니다."));

        if (!ownsBooth(exhibitorId, boothId)) {
            throw new CustomException(ErrorCode.FORBIDDEN, "본인 부스의 리드만 다룰 수 있습니다.");
        }

        return booth;
    }

    private Lead findOwnedLead(Long exhibitorId, Long leadId) {
        Lead lead = leadRepository.findById(leadId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "리드를 찾을 수 없습니다."));

        if (!ownsBooth(exhibitorId, lead.getBooth().getId())) {
            throw new CustomException(ErrorCode.FORBIDDEN, "본인 부스의 리드만 다룰 수 있습니다.");
        }

        return lead;
    }

    private boolean ownsBooth(Long exhibitorId, Long boothId) {
        return boothApplicationRepository.findByExhibitorIdAndStatus(exhibitorId, ApplicationStatus.CONFIRMED).stream()
                .anyMatch(application -> application.getBooth().getId().equals(boothId));
    }
}
