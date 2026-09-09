package com.team4.expo.dto;

import com.team4.expo.domain.Booth;
import com.team4.expo.domain.Post;
import java.util.List;
import lombok.Getter;

// 고객(비회원 포함)용 부스별 전시 차량 목록 응답
@Getter
public class CustomerBoothVehiclesResponse {

    private final Long boothId;
    private final String boothNo;
    private final String boothType;
    private final String title;
    private final String bannerImageUrl;
    private final List<VehicleResponse> vehicles;

    public CustomerBoothVehiclesResponse(Long boothId, String boothNo, String boothType, String title,
                                          String bannerImageUrl, List<VehicleResponse> vehicles) {
        this.boothId = boothId;
        this.boothNo = boothNo;
        this.boothType = boothType;
        this.title = title;
        this.bannerImageUrl = bannerImageUrl;
        this.vehicles = vehicles;
    }

    public static CustomerBoothVehiclesResponse of(Booth booth, Post post, List<VehicleResponse> vehicles) {
        String title = post != null ? post.getTitle() : booth.getBoothNo() + " 부스";
        return new CustomerBoothVehiclesResponse(
                booth.getId(),
                booth.getBoothNo(),
                booth.getType(),
                title,
                booth.getBannerImageUrl(),
                vehicles
        );
    }
}
