package com.team4.identity.config;

import com.team4.common.jwt.JwtProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JwtConfig {

    @Bean
    JwtProvider jwtProvider(
        @Value("${jwt.access-key}") String accessKey,
        @Value("${jwt.refresh-key}") String refreshKey,
        @Value("${jwt.accessTokenExp}") long accessTokenExp,
        @Value("${jwt.refreshTokenExp}") long refreshTokenExp
    ){
        return new JwtProvider(accessKey, refreshKey, accessTokenExp, refreshTokenExp);
    }
}
