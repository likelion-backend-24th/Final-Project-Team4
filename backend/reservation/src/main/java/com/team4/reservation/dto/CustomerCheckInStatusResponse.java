package com.team4.reservation.dto;

import lombok.Getter;

import java.time.LocalDateTime;

// Identity -> Reservation 벌크 조회 응답 - 회원 관리(참관객) 화면의 "체크인 여부"/"최종 입장일" 컬럼용.
// lastCheckedInAt: 이 고객이 USED 상태인 입장권들 중 가장 최근 usedAt. 체크인 이력이 없으면 checkedIn=false, null.
@Getter
public class CustomerCheckInStatusResponse {

    private final Long customerId;
    private final boolean checkedIn;
    private final LocalDateTime lastCheckedInAt;

    public CustomerCheckInStatusResponse(Long customerId, boolean checkedIn, LocalDateTime lastCheckedInAt){
        this.customerId = customerId;
        this.checkedIn = checkedIn;
        this.lastCheckedInAt = lastCheckedInAt;
    }
}
