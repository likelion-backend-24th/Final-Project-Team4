package com.team4.expo.client;

import java.util.Optional;

public interface IdentityClient {
    // 부스에 배정된 참가업체(exhibitorId)의 회사명/업종 조회. 없거나 조회 실패 시 Optional.empty()
    Optional<ExhibitorProfile> getExhibitorProfile(Long userId);

    // QR 스캔으로 확보한 고객(customerId)의 이름/이메일 조회(TASK 11-2). 없거나 조회 실패 시 Optional.empty()
    Optional<CustomerContact> getCustomerContact(Long customerId);

    // 리드 이메일 발송(TASK 11-4). 실패/타임아웃이면 CustomException(INTERNAL_ERROR)을 던져
    // 리드 상태를 바꾸지 않고 재시도 가능하게 둔다(fail-closed).
    void sendMail(String to, String subject, String body);
}
