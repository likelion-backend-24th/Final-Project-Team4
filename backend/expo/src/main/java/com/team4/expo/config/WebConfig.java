package com.team4.expo.config;

import com.team4.common.handler.GlobalExceptionHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

@Configuration
@Import(GlobalExceptionHandler.class) // common 모듈의 전역 예외 핸들러를 expo 서비스 컨텍스트에 등록
public class WebConfig {
}
