package com.team4.expo.client;

// 조회한 참가 업체 표시 정보 (부스 상세)
public record ExhibitorProfile (
        String companyName,
        String industry,
        String businessNo,
        String representativeName,
        String email
){
}
