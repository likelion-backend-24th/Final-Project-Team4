package com.team4.reservation.client;

import java.util.List;
import java.util.Map;

public interface IdentityClient {
    // 관리자 입장 현황 목록에 보여줄 고객 이름을 한 번에 조회
    Map<Long, String> getUserNames(List<Long> userIds);
}
