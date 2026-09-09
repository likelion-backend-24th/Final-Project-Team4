package com.team4.expo.dto;

import com.team4.expo.domain.Booth;
import lombok.Getter;

@Getter
public class BoothManageDetailResponse {

    private final Long boothId;
    private final String boothNo;
    private final String boothType;
    private final Long expoId;
    private final String expoTitle;
    private final String bannerImageUrl;
    private final BoothContentResponse content;

    public BoothManageDetailResponse(Long boothId, String boothNo, String boothType, Long expoId,
                                      String expoTitle, String bannerImageUrl, BoothContentResponse content) {
        this.boothId = boothId;
        this.boothNo = boothNo;
        this.boothType = boothType;
        this.expoId = expoId;
        this.expoTitle = expoTitle;
        this.bannerImageUrl = bannerImageUrl;
        this.content = content;
    }

    public static BoothManageDetailResponse of(Booth booth, BoothContentResponse content) {
        return new BoothManageDetailResponse(
                booth.getId(),
                booth.getBoothNo(),
                booth.getType(),
                booth.getExpo().getId(),
                booth.getExpo().getTitle(),
                booth.getBannerImageUrl(),
                content
        );
    }
}
