package com.team4.expo.config;

import com.team4.common.handler.GlobalExceptionHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@Import(GlobalExceptionHandler.class) // common 모듈의 전역 예외 핸들러를 expo 서비스 컨텍스트에 등록
public class WebConfig implements WebMvcConfigurer {

    // 로컬 개발 중 프론트(Vite)에서 Gateway 없이 Expo(8082)를 직접 호출할 수 있도록 허용.
    // TODO: Gateway 구현되면 프론트는 Gateway만 호출하게 되므로 이 CORS 설정은 재검토 필요.
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("http://localhost:5173", "http://localhost:3000")
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}
