package com.team4.expo.dto;

import com.team4.expo.domain.Vehicle;
import com.team4.expo.domain.VehicleImage;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import lombok.Getter;

@Getter
public class VehicleResponse {

    private final Long vehicleId;
    private final Long boothId;
    private final String name;
    private final List<String> tags;
    private final Long startPrice;
    private final String summary;
    private final String description;
    private final String features;
    private final String colors;
    private final String range;
    private final String battery;
    private final String power;
    private final List<VehicleImageResponse> images;
    private final LocalDateTime updatedAt;

    public VehicleResponse(Long vehicleId, Long boothId, String name, List<String> tags, Long startPrice,
                            String summary, String description, String features, String colors,
                            String range, String battery, String power,
                            List<VehicleImageResponse> images, LocalDateTime updatedAt) {
        this.vehicleId = vehicleId;
        this.boothId = boothId;
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
        this.images = images;
        this.updatedAt = updatedAt;
    }

    public static VehicleResponse from(Vehicle vehicle, List<VehicleImage> images) {
        List<String> tags = vehicle.getTags() == null || vehicle.getTags().isBlank()
                ? List.of()
                : List.of(vehicle.getTags().split(","));

        List<VehicleImageResponse> imageResponses = images.stream()
                .map(VehicleImageResponse::from)
                .collect(Collectors.toList());

        return new VehicleResponse(
                vehicle.getId(),
                vehicle.getBooth().getId(),
                vehicle.getName(),
                tags,
                vehicle.getStartPrice(),
                vehicle.getSummary(),
                vehicle.getDescription(),
                vehicle.getFeatures(),
                vehicle.getColors(),
                vehicle.getRange(),
                vehicle.getBattery(),
                vehicle.getPower(),
                imageResponses,
                vehicle.getUpdatedAt()
        );
    }
}
