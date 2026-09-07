package com.team4.reservation.client;

import java.util.Optional;

// Reservation -> Expo 내부 API 호출 계약. 방문 예약 신청 시점에 대상 박람회가 실제 존재하고
// 공개(OPEN) 상태인지, 언제 시작하는지를 확인하는 데 씀.
public interface ExpoClient {
    Optional<ExpoInfo> getExpo(Long expoId);
}
