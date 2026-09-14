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

    @Column(length = 2000)
    private String features;

    @Column(length = 2000)
    private String colors;

    @Column(name = "range_info")
    private String range;
    private String battery;
    private String power;

    // AI 이미지 분석으로 채워지는 상세 스펙
    private String brand;
    private String category;
    private String drivetrain;

    @Column(name = "charging_type")
    private String chargingType;

    @Column(name = "charging_time")
    private String chargingTime;

    private String dimensions;
    private String weight;

    @Column(name = "seating_capacity")
    private Integer seatingCapacity;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Vehicle(Booth booth, String name, String tags, Long startPrice, String summary,
                   String description, String features, String colors, String range, String battery, String power,
                   String brand, String category, String drivetrain, String chargingType, String chargingTime,
                   String dimensions, String weight, Integer seatingCapacity) {
        this.booth = booth;
        this.name = name;
        this.tags = tags;
        this.startPrice = startPrice;
        this.summary = summary;
        this.description = description;
        this.features = features;
        this.colors = colors;
        this.range = range;
        this.battery = battery;
        this.power = power;
        this.brand = brand;
        this.category = category;
        this.drivetrain = drivetrain;
        this.chargingType = chargingType;
        this.chargingTime = chargingTime;
        this.dimensions = dimensions;
        this.weight = weight;
        this.seatingCapacity = seatingCapacity;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    // 기존 11개 인자 호출부
    public Vehicle(Booth booth, String name, String tags, Long startPrice, String summary,
                   String description, String features, String colors, String range, String battery, String power) {
        this(booth, name, tags, startPrice, summary, description, features, colors, range, battery, power,
                null, null, null, null, null, null, null, null);
    }

    public void update(String name, String tags, Long startPrice, String summary,
                       String description, String features, String colors, String range, String battery, String power,
                       String brand, String category, String drivetrain, String chargingType, String chargingTime,
                       String dimensions, String weight, Integer seatingCapacity) {
        this.name = name;
        this.tags = tags;
        this.startPrice = startPrice;
        this.summary = summary;
        this.description = description;
        this.features = features;
        this.colors = colors;
        this.range = range;
        this.battery = battery;
        this.power = power;
        this.brand = brand;
        this.category = category;
        this.drivetrain = drivetrain;
        this.chargingType = chargingType;
        this.chargingTime = chargingTime;
        this.dimensions = dimensions;
        this.weight = weight;
        this.seatingCapacity = seatingCapacity;
        this.updatedAt = LocalDateTime.now();
    }
}