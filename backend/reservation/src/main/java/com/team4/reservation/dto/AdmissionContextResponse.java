package com.team4.reservation.dto;

import java.time.LocalDate;
import java.util.List;
import lombok.Getter;

// 내부 API(Payment -> Reservation) 응답.
// blockedDates: 요청한 visitDates 중 이미 티켓(FREE/PAID 무관)이 존재해 재결제 대상에서 제외해야 하는 날짜.
// 하나라도 있으면 Payment는 전체 결제를 막음(이중 발급/이중 결제 방지).
@Getter
public class AdmissionContextResponse {

    private final Long expoId;
    private final Long customerId;
    private final List<LocalDate> blockedDates;
    private final Long admissionFee;

    public AdmissionContextResponse(Long expoId, Long customerId, List<LocalDate> blockedDates, Long admissionFee) {
        this.expoId = expoId;
        this.customerId = customerId;
        this.blockedDates = blockedDates;
        this.admissionFee = admissionFee;
    }
}
