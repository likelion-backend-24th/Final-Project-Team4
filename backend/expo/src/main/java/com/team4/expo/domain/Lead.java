package com.team4.expo.domain;

import jakarta.persistence.*;
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

    public Lead(Booth booth, Long customerId, Consultation consultation,
                String customerName, String customerEmail, String interestNote) {
        this.booth = booth;
        this.customerId = customerId;
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

    // 부스후기(BOOTH) 작성 가능 여부(TASK 7-2) - 방문(QR 스캔) 후 5일 이내. 상담과 무관하게 방문 기록 자체가 자격 증거이므로
    // 상태 조건 없음 - Consultation.isReviewable()의 방문판(REVIEWABLE_DAYS 상수를 그대로 재사용).
    public boolean isReviewable() {
        return LocalDateTime.now().isBefore(createdAt.plusDays(Consultation.REVIEWABLE_DAYS));
    }
}
