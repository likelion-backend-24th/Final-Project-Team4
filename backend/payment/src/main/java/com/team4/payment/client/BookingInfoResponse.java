package com.team4.payment.client;

import java.util.List;

// 다른 서비스(예약/신청)의 데이터를, DB 직접 접근 없이 결과만 담아오는 그릇
public record BookingInfoResponse(
        String bookingId,
        Long expoId,
        Long applicantId,
        List<BoothFeeInfo> items,       // 참가비
        boolean payable                 // 결제 가능한 상태
) {
    public record BoothFeeInfo(Long boothId, Long fee){}

    public Long totalFee(){
        return items.stream().mapToLong(BoothFeeInfo::fee).sum();
    }
}