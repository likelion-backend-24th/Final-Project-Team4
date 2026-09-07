package com.team4.expo.dto;

import com.team4.expo.domain.Expo;
import com.team4.expo.domain.ExpoStatus;
import java.time.LocalDateTime;
import lombok.Getter;

// 내부 API(Reservation -> Expo) 응답. 방문 예약 시점에 무료/유료 여부를 가르는 데 필요한
// 최소 정보만 담음(부스 목록 등은 필요 없음).
@Getter
public class ExpoInternalInfoResponse {

    private final Long expoId;
    private final ExpoStatus status;
    private final LocalDateTime startsAt;
    private final LocalDateTime endsAt;
    private final Long admissionFee;

    public ExpoInternalInfoResponse(Long expoId, ExpoStatus status, LocalDateTime startsAt, LocalDateTime endsAt,
                                     Long admissionFee) {
        this.expoId = expoId;
        this.status = status;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
        this.admissionFee = admissionFee;
    }

    public static ExpoInternalInfoResponse from(Expo expo) {
        return new ExpoInternalInfoResponse(expo.getId(), expo.getStatus(), expo.getStartsAt(), expo.getEndsAt(),
                expo.getAdmissionFee());
    }
}
