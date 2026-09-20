package com.team4.review.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.team4.common.error.ErrorCode;
import com.team4.common.response.ObjectMapperWriter;
import com.team4.review.security.GatewayAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, ObjectMapper objectMapper) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // 후기 목록 조회(GET)는 비회원도 가능(게이트웨이 화이트리스트), 작성/사진 추가(POST)·수정(PUT)·삭제(DELETE)는 USER 롤만.
                        .requestMatchers(HttpMethod.POST, "/api/customer/booths/*/reviews/**").hasRole("USER")
                        .requestMatchers(HttpMethod.PUT, "/api/customer/booths/*/reviews/*").hasRole("USER")
                        .requestMatchers(HttpMethod.DELETE, "/api/customer/booths/*/reviews/*").hasRole("USER")
                        .requestMatchers("/api/customer/reviews/**").hasRole("USER")
                        // 참가업체가 본인 부스 후기를 실명으로 조회(2026-09-16).
                        .requestMatchers("/api/exhibitor/booths/*/reviews").hasRole("EXHIBITOR")
                        .anyRequest().permitAll())
                .addFilterBefore(new GatewayAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class)
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((request, response, ex) -> // 401
                                ObjectMapperWriter.write(response, ErrorCode.UNAUTHENTICATED, request.getHeader("X-Trace-Id"), objectMapper))
                        .accessDeniedHandler((request, response, ex) -> // 403
                                ObjectMapperWriter.write(response, ErrorCode.FORBIDDEN, request.getHeader("X-Trace-Id"), objectMapper)));
        return http.build();
    }
}
