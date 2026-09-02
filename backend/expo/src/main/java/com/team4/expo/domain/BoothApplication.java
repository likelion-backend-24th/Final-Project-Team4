package com.team4.expo.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "booth_applications")
@Getter
@NoArgsConstructor
public class BoothApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booth_id")
    private Booth booth;

    private Long exhibitorId;

    private String companyName;
    private String managerName;
    private String contact;
    private String intro;

    @Enumerated(EnumType.STRING)
    private ApplicationStatus status;

    private String rejectReason;

    private LocalDateTime submittedAt;

    public BoothApplication(Booth booth, Long exhibitorId, String companyName,
                            String managerName, String contact, String intro) {
        this.booth = booth;
        this.exhibitorId = exhibitorId;
        this.companyName = companyName;
        this.managerName = managerName;
        this.contact = contact;
        this.intro = intro;
        this.status = ApplicationStatus.SUBMITTED;
        this.submittedAt = LocalDateTime.now();
    }
}