package com.team4.identity.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig {

    private static final List<String> BASE_ORIGINS = List.of(
            "http://localhost:3000",
            "http://localhost:5173"
    );

    @Value("${cors.additional-origins:}")
    private String additionalOrigins;

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        List<String> origins = new ArrayList<>(BASE_ORIGINS);
        if (additionalOrigins != null && !additionalOrigins.isBlank()) {
            Arrays.stream(additionalOrigins.split(","))
                    .map(String::trim)
                    .filter(o -> !o.isEmpty())
                    .forEach(origins::add);
        }

        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(origins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
