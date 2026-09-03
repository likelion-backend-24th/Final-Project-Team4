package com.team4.gateway.filter;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.UUID;

public class TraceIdFilter implements GlobalFilter, Ordered {

    private static final String HEADER_TRACE_ID = "X-Trace-Id";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String traceId = exchange.getRequest().getHeaders().getFirst(HEADER_TRACE_ID); // 헤더에서 traceId 꺼내기

        if(!StringUtils.hasText(traceId)) // traceId 없으면 랜덤 생성해 삽입
            traceId = UUID.randomUUID().toString();

        String finalTraceId = traceId;

        // 하위 서비스 (expo, payment, identity..) 로 traceId 전파. GlobalExceptionHandler에서 traceId 읽음.
        ServerHttpRequest mutatedRequest = exchange.getRequest().mutate() // mutate: 속성변경
                .headers(header-> header.set(HEADER_TRACE_ID, finalTraceId)).build();

        // 응답에도 traceId 실음.
        exchange.getResponse().getHeaders().set(HEADER_TRACE_ID, finalTraceId);

        return chain.filter(exchange.mutate().request(mutatedRequest).build());
    }

    @Override
    public int getOrder() {
        return -110; // jwtAuthenticationFilter보다 먼저
    }
}
