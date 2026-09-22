package com.team4.identity.expo.client;

import java.util.List;

public interface ExpoClient {
    // 관리자 회원(참가업체) 목록/엑셀/통계 화면 전용 - 참가 신청 건수·참가 여부 표시용. 화면을 막으면 안 되는 조회라 fail-open:
    // 구현체는 실패해도 예외를 던지지 않고 빈 목록을 돌려준다(호출부가 전부 "신청 0건/미참가"로 처리).
    List<ExhibitorApplicationStats> getApplicationStats(List<Long> exhibitorIds);
}