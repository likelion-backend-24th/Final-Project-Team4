package com.team4.expo.client;

import java.util.Optional;

public interface IdentityClient {
    // 부스에 배정된 참가업체(exhibitorId)의 회사명/업종 조회. 없거나 조회 실패 시 Optional.empty()
    Optional<ExhibitorProfile> getExhibitorProfile(Long userId);

    // QR 스캔으로 확보한 고객(customerId)의 이름/이메일 조회(TASK 11-2). 없거나 조회 실패 시 Optional.empty()
    Optional<CustomerContact> getCustomerContact(Long customerId);
}
