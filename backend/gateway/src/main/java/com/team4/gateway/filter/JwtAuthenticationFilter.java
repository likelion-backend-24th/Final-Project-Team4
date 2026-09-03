package com.team4.gateway.filter;

import com.team4.common.jwt.JwtProvider;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.util.pattern.PathPattern;
import org.springframework.web.util.pattern.PathPatternParser;
import reactor.core.publisher.Mono;

import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter implements GlobalFilter, Ordered {

    private static final String HEADER_USER_ID = "X-User-Id"; // user id 헤더
    private static final String HEADER_USER_ROLE = "X-User-Role"; // user role 헤더
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtProvider jwtProvider;

    // 화이트리스트 - 토큰 없이 통과 가능 경로 (로그인,회원가입,토큰 재발급,로그아웃)
    private static final List<PathPattern> WHITELIST = List.of(
            parse("/api/auth/**")
    );

    // 화이트리스트 패턴 문자열을 Spring Cloud Gateway 라우팅과 동일한 PathPattern으로 컴파일
    private static PathPattern parse(String pattern) {
        return new PathPatternParser().parse(pattern);
    }

    @Override // ServerWebExchange - HTTP 요청-응답 상호작용 계약. HTTP 요청/응답에 대한 접근 제공
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) { // WebFlux

        String userId = null;
        String role = null;

        // preflight 인증 대상 제외
        if (exchange.getRequest().getMethod() == HttpMethod.OPTIONS) {
            return chain.filter(exchange);
        }

        String authorization = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);

        if(authorization != null && authorization.startsWith(BEARER_PREFIX)) {
            String token = authorization.substring(BEARER_PREFIX.length()).trim(); // "Bearer " 잘라냄

            try{
                Claims claims = jwtProvider.parseAccessToken(token); // accessToken 파싱

                userId = claims.getSubject();
                role = claims.get("role", String.class);
            }
            catch (JwtException | IllegalArgumentException exception){
                return unauthorized(exchange);
            }
            if (userId == null || role == null) {
                return unauthorized(exchange);
            }
        }
        else if (!isWhitelisted(exchange)) {
            // 토큰 없고 보호 경로 => 차단
            return unauthorized(exchange);
        }

        String verifiedUserId = userId;
        String verifiedRole = role;

        ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                .headers(h -> {
                    // 클라에서 보낸 헤더 제거
                    h.remove(HEADER_USER_ID);
                    h.remove(HEADER_USER_ROLE);
                    if (verifiedUserId != null) { // jwt에서 꺼낸걸로 헤더 삽입
                        h.set(HEADER_USER_ID, verifiedUserId);
                        h.set(HEADER_USER_ROLE, verifiedRole);
                    }
                })
                .build();

        return chain.filter(exchange.mutate().request(mutatedRequest).build());
    }

    // 현재 요청 경로가 인증 없이 통과 가능한 화이트리스트에 속하는지?
    private boolean isWhitelisted(ServerWebExchange exchange) {
        var path = exchange.getRequest().getPath().pathWithinApplication();
        return WHITELIST.stream()
                .anyMatch(p -> p.matches(path));
    }

    // 인증 실패 응답 - 401 + WWW-Authenticate 헤더 내려보내고 체인 종료
    private Mono<Void> unauthorized(ServerWebExchange exchange) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().add(HttpHeaders.WWW_AUTHENTICATE, "Bearer ");
        return response.setComplete();
    }

    @Override
    public int getOrder() {
        return -100;
    }
}
