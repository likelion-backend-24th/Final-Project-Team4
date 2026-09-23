package com.team4.expo.vehicle.dto;

import com.team4.expo.vehicle.domain.VehicleImage;
import lombok.Getter;

@Getter
public class VehicleImageResponse {

    private final Long imageId;
    private final String imageUrl;

    public VehicleImageResponse(Long imageId, String imageUrl) {
        this.imageId = imageId;
        this.imageUrl = imageUrl;
    }

    public static VehicleImageResponse from(VehicleImage image) {
        return new VehicleImageResponse(image.getId(), image.getImageUrl());
    }
}
