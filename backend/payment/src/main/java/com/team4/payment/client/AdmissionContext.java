package com.team4.payment.client;

import java.time.LocalDate;
import java.util.List;

// blockedDates: 요청한 visitDates 중 이미 티켓(무료/유료 무관)이 존재해 재결제 대상에서 빼야 하는 날짜.
// 하나라도 있으면 전체 결제를 막는다(이중 발급 방지).
public record AdmissionContext (
        Long expoId,
        Long customerId,
        List<LocalDate> blockedDates,
        Long admissionFee
) {}
