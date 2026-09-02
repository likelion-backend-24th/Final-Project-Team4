package com.team4.identity.user.auth;

// 사업자 번호 확인
public interface BusinessVerification {
    boolean verify(String businessNo);
}
