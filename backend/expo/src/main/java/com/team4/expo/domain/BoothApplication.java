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

    private String exhibitItem;
    private String conceptDescription;

    private boolean facilityPower;
    private boolean facilityWater;
    private boolean facilityInternet;

    private String additionalRequest;

    @Enumerated(EnumType.STRING)
    private ApplicationStatus status;

    private String rejectReason;

    private LocalDateTime submittedAt;

    public BoothApplication(Booth booth, Long exhibitorId, String exhibitItem, String conceptDescription,
                            boolean facilityPower, boolean facilityWater, boolean facilityInternet,
                            String additionalRequest) {
        this.booth = booth;
        this.exhibitorId = exhibitorId;
        this.exhibitItem = exhibitItem;
        this.conceptDescription = conceptDescription;
        this.facilityPower = facilityPower;
        this.facilityWater = facilityWater;
        this.facilityInternet = facilityInternet;
        this.additionalRequest = additionalRequest;
        this.status = ApplicationStatus.SUBMITTED;
        this.submittedAt = LocalDateTime.now();
    }
}
