package com.team4.expo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import lombok.Getter;

@Getter
public class VehicleRequest {

    @NotBlank
    private String name;

    private List<String> tags;

    @NotNull
    private Long startPrice;

    @NotBlank
    private String summary;

    @NotBlank
    private String description;

    private String range;
    private String battery;
    private String power;
}
