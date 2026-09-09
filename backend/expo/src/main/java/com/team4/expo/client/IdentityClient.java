package com.team4.expo.client;

import java.util.Optional;

public interface IdentityClient {
    // 부스에 배정된 참가업체(exhibitorId)의 회사명/업종 조회. 없거나 조회 실패 시 Optional.empty()
    Optional<ExhibitorProfile> getExhibitorProfile(Long userId);
}
