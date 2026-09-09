package com.team4.expo.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "vehicles")
@Getter
@NoArgsConstructor
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booth_id")
    private Booth booth;

    private String name;
    private String tags;

    private Long startPrice;

    private String summary;

    @Column(length = 2000)
    private String description;

    @Column(name = "range_info")
    private String range;
    private String battery;
    private String power;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Vehicle(Booth booth, String name, String tags, Long startPrice, String summary,
                   String description, String range, String battery, String power) {
        this.booth = booth;
        this.name = name;
        this.tags = tags;
        this.startPrice = startPrice;
        this.summary = summary;
        this.description = description;
        this.range = range;
        this.battery = battery;
        this.power = power;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public void update(String name, String tags, Long startPrice, String summary,
                        String description, String range, String battery, String power) {
        this.name = name;
        this.tags = tags;
        this.startPrice = startPrice;
        this.summary = summary;
        this.description = description;
        this.range = range;
        this.battery = battery;
        this.power = power;
        this.updatedAt = LocalDateTime.now();
    }
}
