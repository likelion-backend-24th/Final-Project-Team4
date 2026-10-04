package com.team4.expo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

// expo 서비스(포트 8082)의 진입점. common 모듈(에러 처리/응답 포맷 등)도 함께 스캔하도록
// scanBasePackages를 명시 (common은 별도 스프링부트 앱이 아니라 라이브러리라 자동 스캔 안 됨).
@SpringBootApplication(scanBasePackages = {"com.team4.expo", "com.team4.common"})
@EnableScheduling // 부스 결제 기한 초과 자동 반려 스케줄러
public class ExpoApplication {

    public static void main(String[] args) {
        SpringApplication.run(ExpoApplication.class, args);
    }
}
