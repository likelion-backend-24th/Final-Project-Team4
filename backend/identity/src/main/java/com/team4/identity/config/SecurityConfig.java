package com.team4.identity.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.team4.common.error.ErrorCode;
import com.team4.common.response.ObjectMapperWriter;
import com.team4.common.security.GatewayAuthenticationFilter;
import com.team4.identity.security.oauth2.CookieAuthorizationRequestRepository;
import com.team4.identity.security.oauth2.CustomAuthorizationRequestResolver;
import com.team4.identity.security.oauth2.CustomOAuth2UserService;
import com.team4.identity.security.oauth2.OAuth2SuccessHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final CookieAuthorizationRequestRepository cookieAuthorizationRequestRepository;
    private final CustomAuthorizationRequestResolver customAuthorizationRequestResolver;
    private final CustomOAuth2UserService customOAuth2UserService;
    private final OAuth2SuccessHandler oAuth2SuccessHandler;

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, ObjectMapper objectMapper) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/admin/users/**").hasRole("ADMIN")
                        .anyRequest().permitAll())
                .addFilterBefore(new GatewayAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class)
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((request, response, ex) -> // 401
                                ObjectMapperWriter.write(response, ErrorCode.UNAUTHENTICATED, request.getHeader("X-Trace-Id"), objectMapper))
                        .accessDeniedHandler((request, response, ex) -> // 403
                                ObjectMapperWriter.write(response, ErrorCode.FORBIDDEN, request.getHeader("X-Trace-Id"), objectMapper)))
                .oauth2Login(oauth -> oauth
                        .authorizationEndpoint(a -> a
                                .authorizationRequestRepository(cookieAuthorizationRequestRepository)
                                .authorizationRequestResolver(customAuthorizationRequestResolver))
                        .userInfoEndpoint(u -> u.userService(customOAuth2UserService))
                        .successHandler(oAuth2SuccessHandler)
                );
        return http.build();
    }
}
