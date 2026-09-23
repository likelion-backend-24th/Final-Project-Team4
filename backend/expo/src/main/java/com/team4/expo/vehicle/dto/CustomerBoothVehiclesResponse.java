package com.team4.expo.vehicle.dto;


import com.team4.expo.booth.domain.Booth;
import com.team4.expo.booth.domain.Post;
import java.util.List;
import lombok.Getter;

// 고객(비회원 포함)용 부스별 전시 차량 목록 응답
@Getter
public class CustomerBoothVehiclesResponse {

    private final Long boothId;
    private final String boothNo;
    private final String boothType;
    private final String title;
    private final String companyName;
    private final String applicationGroupId;
    private final String bannerImageUrl;
    private final List<VehicleResponse> vehicles;

    public CustomerBoothVehiclesResponse(Long boothId, String boothNo, String boothType, String title,
                                         String companyName, String applicationGroupId, String bannerImageUrl,
                                         List<VehicleResponse> vehicles) {
        this.boothId = boothId;
        this.boothNo = boothNo;
        this.boothType = boothType;
        this.title = title;
        this.companyName = companyName;
        this.applicationGroupId = applicationGroupId;
        this.bannerImageUrl = bannerImageUrl;
        this.vehicles = vehicles;
    }

    // title: 부스 소개 콘텐츠(post)를 등록했으면 그 제목을, 아니면 참가업체 회사명을, 그마저 없으면 부스 번호를 제목으로 쓴다.
    // companyName: 부스 소개 제목과 상관없이 항상 참가업체 회사명 원본.
    // applicationGroupId: 이 부스가 속한 신청 그룹(BoothApplicationGroup) ID - 같은 신청으로 함께 접수한 부스끼리만 화면에서 묶는 기준.
    public static CustomerBoothVehiclesResponse of(Booth booth, Post post, String companyName,
                                                   String applicationGroupId, List<VehicleResponse> vehicles) {
        String title = post != null ? post.getTitle()
                : companyName != null ? companyName
                  : booth.getBoothNo() + " 부스";
        return new CustomerBoothVehiclesResponse(
                booth.getId(),
                booth.getBoothNo(),
                booth.getType(),
                title,
                companyName,
                applicationGroupId,
                booth.getBannerImageUrl(),
                vehicles
        );
    }
}