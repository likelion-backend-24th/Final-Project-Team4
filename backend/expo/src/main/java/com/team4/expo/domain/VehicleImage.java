package com.team4.expo.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "vehicle_images")
@Getter
@NoArgsConstructor
public class VehicleImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id")
    private Vehicle vehicle;

    private String imageUrl;

    private Integer sortOrder;

    private LocalDateTime createdAt;

    public VehicleImage(Vehicle vehicle, String imageUrl, Integer sortOrder) {
        this.vehicle = vehicle;
        this.imageUrl = imageUrl;
        this.sortOrder = sortOrder;
        this.createdAt = LocalDateTime.now();
    }
}
