package com.team4.review.client;

import java.util.Optional;

public interface IdentityClient {
    // 후기 작성자(customerId)의 이름 조회. 없거나 조회 실패 시 Optional.empty()
    Optional<String> getCustomerName(Long customerId);
}
