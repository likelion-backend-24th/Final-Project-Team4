package com.team4.reservation.dto;

import lombok.Getter;

// 내부 API(Payment -> Reservation) 응답.
@Getter
public class AdmissionContextResponse {

    private final Long expoId;
    private final Long customerId;
    private final boolean hasFreeAdmission;
    private final Long admissionFee;

    public AdmissionContextResponse(Long expoId, Long customerId, boolean hasFreeAdmission, Long admissionFee) {
        this.expoId = expoId;
        this.customerId = customerId;
        this.hasFreeAdmission = hasFreeAdmission;
        this.admissionFee = admissionFee;
    }
}
