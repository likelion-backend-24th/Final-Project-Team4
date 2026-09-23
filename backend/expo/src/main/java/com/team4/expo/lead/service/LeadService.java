package com.team4.expo.lead.service;


import com.team4.expo.booth.domain.BoothApplication;
import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.expo.client.AiSummaryClient;
import com.team4.expo.client.CustomerContact;
import com.team4.expo.client.ExhibitorProfile;
import com.team4.expo.client.IdentityClient;
import com.team4.expo.client.ReservationClient;
import com.team4.expo.client.TicketResolveResult;
import com.team4.expo.booth.domain.ApplicationStatus;
import com.team4.expo.booth.domain.Booth;
import com.team4.expo.consultation.domain.Consultation;
import com.team4.expo.consultation.domain.ConsultationStatus;
import com.team4.expo.lead.domain.Lead;
import com.team4.expo.lead.dto.LeadResponse;
import com.team4.expo.booth.dto.MyBoothResponse;
import com.team4.expo.booth.dto.VisitedBoothResponse;
import com.team4.expo.booth.repository.BoothApplicationRepository;
import com.team4.expo.booth.repository.BoothRepository;
import com.team4.expo.consultation.repository.ConsultationRepository;
import com.team4.expo.lead.repository.LeadRepository;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashMap;
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

        // 같은 QR(=같은 customerId+boothId+visitDate) 재스캔이면 새로 만들지 않고 기존 리드를 그대로 반환(멱등)
        Lead existing = leadRepository.findByBooth_IdAndCustomerIdAndVisitDate(boothId, ticket.customerId(), ticket.visitDate())
                .orElse(null);
        if (existing != null) {
            return LeadResponse.from(existing);
        }

        // 매칭되는 승인된 상담 신청이 있으면 기존대로 - 그 상담은 leadConsent(연락처 제공 동의)가 있어야만 리드가 된다
        // (이메일 발송까지 이어지는 흐름이라 동의 필수, 2026-09-14 확정). 매칭되는 상담이 아예 없으면 상담과 무관한
        // 워크인 방문으로 보고 동의 없이도 리드(방문 기록)를 만든다(TASK 7-1, 2026-09-16 확정) - 후기 자격 판단에만 쓰이고
        // 이메일 발송 대상은 아니므로 leadConsent를 요구할 이유가 없다.
        Consultation matched = consultationRepository
                .findByCustomerIdAndBooth_IdAndPreferredDateAndStatus(
                        ticket.customerId(), boothId, ticket.visitDate(), ConsultationStatus.APPROVED)
                .orElse(null);

        if (matched != null && !matched.isLeadConsent()) {
            throw new CustomException(ErrorCode.INVALID_STATE, "리드 확보에 동의한 승인된 상담만 QR 스캔이 가능합니다.");
        }

        CustomerContact contact = identityClient.getCustomerContact(ticket.customerId())
                .orElseGet(() -> matched != null
                        ? new CustomerContact(matched.getCustomerName(), matched.getCustomerEmail())
                        : new CustomerContact(null, null));

        // 이메일 발송 가능 여부(leadConsent) - 상담 신청 건은 위에서 이미 동의 확인됐으니 항상 true.
        // 워크인은 별도 동의 절차가 없어 일단 false로 만들고, 참가업체가 스캔 결과 화면에서 현장에서
        // 고객에게 구두로 확인 후 체크박스로 동의 처리(confirmLeadConsent, 2026-09-18 확정).
        boolean leadConsent = matched != null;

        // interestNote는 현장 상담 내용(자유 텍스트) - TASK 11-3(POST .../leads/{leadId}/summary)에서 채움. 생성 시점엔 비워둠.
        Lead lead = new Lead(booth, ticket.customerId(), ticket.visitDate(), matched,
                contact.name(), contact.email(), null, leadConsent);
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

    // 고객이 해당 박람회에서 방문 기록(Lead)을 남긴 부스 목록(TASK 7-1) - 후기 작성 대상 선택 화면에서 씀.
    @Transactional(readOnly = true)
    public List<VisitedBoothResponse> listVisitedBooths(Long customerId, Long expoId) {
        // 같은 부스를 여러 날짜에 방문했으면 방문 기록이 여러 건이라 부스 단위로 묶고, 작성 가능한 기록 중 가장 늦은 기한을 내려준다.
        return leadRepository.findByCustomerIdAndBooth_Expo_IdOrderByCreatedAtDesc(customerId, expoId).stream()
                .collect(Collectors.groupingBy(lead -> lead.getBooth().getId(), LinkedHashMap::new, Collectors.toList()))
                .values().stream()
                .map(leads -> {
                    Booth booth = leads.get(0).getBooth();
                    LocalDate deadline = leads.stream().filter(Lead::isReviewable).map(Lead::reviewDeadline)
                            .max(Comparator.naturalOrder()).orElse(null);
                    return VisitedBoothResponse.of(booth, companyNameOf(booth), deadline);
                })
                .collect(Collectors.toList());
    }

    // ConsultationService.companyNameOf와 같은 패턴 - 부스 소개 콘텐츠가 없는 업체를 위한 표시명 조회, 실패 시 null.
    private String companyNameOf(Booth booth) {
        return boothApplicationRepository.findByBooth_IdAndStatus(booth.getId(), ApplicationStatus.CONFIRMED)
                .map(com.team4.expo.booth.domain.BoothApplication::getExhibitorId)
                .flatMap(identityClient::getExhibitorProfile)
                .map(ExhibitorProfile::companyName)
                .orElse(null);
    }

    // 현장 상담 메모를 입력받아 Gemini로 고객용 이메일 본문 초안을 생성(TASK 11-3). 이 시점엔 발송하지 않음(미리보기).
    // Gemini 실패/타임아웃이면 fail-open - 메모 원문을 그대로 이메일 본문 후보로 저장.
    // 상담 AI 요약(MAX_AI_SUMMARY_RETRY)과 같은 이유로 재시도 횟수 제한 - 메모 안 바꾸고 버튼 계속 눌러도
    // 매번 실제 Gemini 호출이 나가서 무제한으로 뒀다가는 비용이 새는 지점이었음(2026-09-15).
    public LeadResponse generateEmailSummary(Long exhibitorId, Long leadId, String consultationNote) {
        Lead lead = findOwnedLead(exhibitorId, leadId);

        if (!lead.isLeadConsent()) {
            throw new CustomException(ErrorCode.INVALID_STATE, "고객이 연락처 제공에 동의하지 않아 이메일을 작성할 수 없습니다.");
        }
        if (!lead.canRetryEmailSummary()) {
            throw new CustomException(ErrorCode.INVALID_STATE, "AI 요약 생성 횟수를 초과했습니다.");
        }

        String emailBody = aiSummaryClient.summarizeForEmail(lead.getCustomerName(), consultationNote)
                .orElse(consultationNote);
        lead.recordEmailSummary(consultationNote, emailBody);

        return LeadResponse.from(lead);
    }

    // 참가업체가 확정한 이메일 본문을 고객에게 최종 발송(TASK 11-4). Identity 내부 API 호출 실패 시
    // 예외가 그대로 전파되어(fail-closed) 리드 상태를 바꾸지 않고 재시도 가능하게 둔다.
    public LeadResponse sendInfo(Long exhibitorId, Long leadId, String emailBody) {
        Lead lead = findOwnedLead(exhibitorId, leadId);

        if (!lead.isLeadConsent()) {
            throw new CustomException(ErrorCode.INVALID_STATE, "고객이 연락처 제공에 동의하지 않아 발송할 수 없습니다.");
        }
        if (lead.getCustomerEmail() == null || lead.getCustomerEmail().isBlank()) {
            throw new CustomException(ErrorCode.INVALID_STATE, "고객 이메일이 없어 발송할 수 없습니다. 이메일을 먼저 입력해주세요.");
        }

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

    // 워크인 리드는 스캔 시점엔 동의가 없는 상태(leadConsent=false)로 생성됨 - 참가업체가 QR 스캔 결과
    // 화면에서 고객에게 구두로 연락처 제공 동의를 확인한 뒤 체크박스로 표시하면 이 API로 확정(2026-09-18 확정).
    // 상담 신청 건은 신청 시점에 이미 동의를 받았으므로(Consultation.leadConsent) 대상 아님(FORBIDDEN).
    public LeadResponse confirmLeadConsent(Long exhibitorId, Long leadId) {
        Lead lead = findOwnedLead(exhibitorId, leadId);

        if (lead.getConsultation() != null) {
            throw new CustomException(ErrorCode.FORBIDDEN, "상담 신청 건은 이미 신청 시점에 동의가 확인되었습니다.");
        }

        lead.confirmLeadConsent();
        return LeadResponse.from(lead);
    }

    // 참가업체가 리드의 고객 이메일을 직접 입력/수정(워크인은 이메일이 아예 없을 수 있어서, 상담 신청
    // 건도 오탈자·변경된 주소를 현장에서 고칠 수 있게 2026-09-18 확정 - 상담 신청 원본 데이터는 안 건드림).
    public LeadResponse updateCustomerEmail(Long exhibitorId, Long leadId, String customerEmail) {
        Lead lead = findOwnedLead(exhibitorId, leadId);

        lead.updateCustomerEmail(customerEmail);
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
        return isOwnedByExhibitor(exhibitorId, boothId);
    }

    // Review 서비스 -> Expo 내부 호출(TASK 참가업체 후기 조회) - 이 부스가 그 참가업체 소유(참가 확정)인지 확인.
    @Transactional(readOnly = true)
    public boolean isOwnedByExhibitor(Long exhibitorId, Long boothId) {
        return boothApplicationRepository.findByExhibitorIdAndStatus(exhibitorId, ApplicationStatus.CONFIRMED).stream()
                .anyMatch(application -> application.getBooth().getId().equals(boothId));
    }
}
