package com.team4.expo.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

// 게이트웨이가 주입한 X-User-* 헤더를 SecurityContext의 Authentication으로 변환하는 필터
public class GatewayAuthenticationFilter extends OncePerRequestFilter {

    private static final String USER_ID = "X-User-Id";
    private static final String USER_ROLE = "X-User-Role";
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        String userId = request.getHeader(USER_ID);
        String userRole = request.getHeader(USER_ROLE);

        if(StringUtils.hasText(userId) && StringUtils.hasText(userRole) && SecurityContextHolder.getContext().getAuthentication() == null) {
            GatewayUser gatewayUser = new GatewayUser(Long.valueOf(userId), userRole);

            Authentication authentication = new UsernamePasswordAuthenticationToken(
                    gatewayUser,
                    null,
                    List.of(new SimpleGrantedAuthority("ROLE_"+userRole))
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        filterChain.doFilter(request, response);
    }
}
