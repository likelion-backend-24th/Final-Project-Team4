package com.team4.identity.user.auth;

// 사업자 번호 정규화 Mock 클래스 -> 이후 국세청API를 통한 검증으로 교체
public class MockBusinessVerification implements BusinessVerification{
    @Override
    public boolean verify(String businessNo) {
        String normalized = businessNo.replace("-","");

        if(normalized == null || normalized.length() != 10){
            return false;
        }

        for(char c: normalized.toCharArray()){
            if(!Character.isDigit(c))
                return false;
        }

        return true;
    }
}
