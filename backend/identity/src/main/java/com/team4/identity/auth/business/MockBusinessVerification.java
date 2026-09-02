package com.team4.identity.auth.business;

import org.springframework.stereotype.Component;

// 사업자 번호 형식 검증 Mock -> 이후 국세청 API 검증으로 교체
@Component
public class MockBusinessVerification implements BusinessVerification {

    @Override
    public boolean verify(String businessNo) {
        if (businessNo == null) {
            return false;
        }
        String normalized = businessNo.replace("-", "");
        if (normalized.length() != 10) {
            return false;
        }
        for (char c : normalized.toCharArray()) {
            if (!Character.isDigit(c)) {
                return false;
            }
        }
        return true;
    }
}
