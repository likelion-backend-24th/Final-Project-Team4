package com.team4.expo.domain;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;

// 참가업체가 부스에서 고객 QR을 스캔해 확보한 리드 1건. customerId는 Identity 서비스 논리 참조(FK 없음).
@Entity
@Table(name = "leads")
@Getter
@NoArgsConstructor
public class Lead {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booth_id")
    private Booth booth;

    private Long customerId;

    // QR(입장권)에 찍힌 방문 예정일 - 후기 작성 자격(TASK 7-2) 판단에 스캔 시각(createdAt)이 아니라 이 값을 쓴다.
    private LocalDate visitDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "consultation_id")
    private Consultation consultation;

    private String customerName;
    private String customerEmail;

    @Column(length = 1000)
    private String interestNote;

    @Column(length = 2000)
    private String emailSummary;

    private int emailSummaryRetryCount;

    @Enumerated(EnumType.STRING)
    private LeadStatus status;

    private LocalDateTime createdAt;

    public Lead(Booth booth, Long customerId, LocalDate visitDate, Consultation consultation,
                String customerName, String customerEmail, String interestNote) {
        this.booth = booth;
        this.customerId = customerId;
        this.visitDate = visitDate;
        this.consultation = consultation;
        this.customerName = customerName;
        this.customerEmail = customerEmail;
        this.interestNote = interestNote;
        this.status = LeadStatus.NEW;
        this.createdAt = LocalDateTime.now();
    }

    // 상담 AI 요약(Consultation)과 같은 패턴 - 재생성 버튼 남용 방지(2026-09-15).
    public static final int MAX_EMAIL_SUMMARY_RETRY = 3;

    public boolean canRetryEmailSummary() {
        return emailSummaryRetryCount < MAX_EMAIL_SUMMARY_RETRY;
    }

    // LeadService.generateEmailSummary()에서 호출. 현장 상담 메모 입력 + Gemini 요약(또는 fail-open 시 메모 원문) 저장.
    // 호출될 때마다(성공/fail-open 무관) 횟수를 차감 - Gemini 실패로 원문 그대로 나온 경우도 API 호출 자체는 발생했으므로.
    public void recordEmailSummary(String interestNote, String emailSummary) {
        this.interestNote = interestNote;
        this.emailSummary = emailSummary;
        this.emailSummaryRetryCount++;
    }

    // LeadService.sendInfo()에서 Identity 메일 발송 성공 후 호출(TASK 11-4).
    public void markSent() {
        this.status = LeadStatus.SENT;
    }

    // 부스후기(BOOTH) 작성 가능 여부(TASK 7-2, 2026-09-16 방문일 기준으로 보강) - 방문 예정일(visitDate)이 지나야
    // 하고(아직 방문 전인데 QR만 미리 찍은 경우를 막음), 그 날로부터 5일 이내여야 함. 스캔 시각(createdAt)이 아니라
    // visitDate를 기준으로 삼는다 - Consultation.isReviewable()의 "다음날부터" 규칙과 같은 REVIEWABLE_DAYS 재사용.
    public boolean isReviewable() {
        LocalDate today = LocalDate.now();
        return today.isAfter(visitDate) && !today.isAfter(visitDate.plusDays(Consultation.REVIEWABLE_DAYS));
    }
}
