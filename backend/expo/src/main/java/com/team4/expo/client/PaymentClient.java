package com.team4.expo.client;

import java.util.Optional;

public interface PaymentClient {

    // groupId 기준 결제 상태 조회.
    Optional<String> getPaymentStatus(String groupId);
}
