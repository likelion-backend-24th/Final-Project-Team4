package com.team4.expo.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.team4.common.error.ErrorCode;
import com.team4.common.response.ObjectMapperWriter;
import com.team4.expo.security.GatewayAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {
    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, ObjectMapper objectMapper) throws Exception {
        http
                .cors(Customizer.withDefaults()) // WebConfig의 CORS 매핑을 시큐리티 필터에서 존중 (로컬 직접 호출용)
                .csrf(csrf -> csrf.disable())
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/exhibitor/**").hasRole("EXHIBITOR")
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