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

    // LeadService.generateEmailSummary()에서 호출. 현장 상담 메모 입력 + Gemini 요약(또는 fail-open 시 메모 원문) 저장.
    public void recordEmailSummary(String interestNote, String emailSummary) {
        this.interestNote = interestNote;
        this.emailSummary = emailSummary;
    }
}
