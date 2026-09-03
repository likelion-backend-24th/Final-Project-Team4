package com.team4.gateway.config;

import com.team4.common.jwt.JwtProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JwtConfig {

    @Bean
    JwtProvider jwtProvider(@Value("${jwt.access-key}") String accessKey){
        return new JwtProvider(accessKey);
    }
}
