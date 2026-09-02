package com.team4.expo.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "booths")
@Getter
@NoArgsConstructor
public class Booth {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expo_id")
    private Expo expo;

    private String boothNo;
    private String type;
    private Integer fee;

    @Enumerated(EnumType.STRING)
    private BoothStatus status;

    public Booth(Expo expo, String boothNo, String type, Integer fee) {
        this.expo = expo;
        this.boothNo = boothNo;
        this.type = type;
        this.fee = fee;
        this.status = BoothStatus.AVAILABLE;
    }
}