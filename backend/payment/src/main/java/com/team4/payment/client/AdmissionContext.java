package com.team4.payment.client;

public record AdmissionContext (
        Long expoId,
        Long customerId,
        boolean hasFreeAdmission,
        Long admissionFee
) {}
