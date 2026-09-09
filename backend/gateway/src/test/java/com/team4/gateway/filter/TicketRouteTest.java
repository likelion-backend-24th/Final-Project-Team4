package com.team4.gateway.filter;

import com.team4.common.jwt.JwtProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

// US12(#68) 담당: 방문 예약 신청/조회(POST,GET /api/customer/reservations) 라우팅 인증 규칙.
// 실제 라우팅 대상(Reservation, application.yml)이 아니라 "Gateway가 이 경로를 인증 없이는 막고,
// 인증되면 JWT에서 꺼낸 신원만 신뢰해 X-User-Id/X-User-Role로 넘겨준다"는 Gateway 책임만 검증한다
// (역할이 USER인지 아닌지 자체를 막는 건 Reservation의 SecurityConfig 몫 - Gateway 테스트 범위 아님).
class TicketRouteTest {

    private static final String SECRET = "test-access-key-long-enough-for-hs256-aaaaaaaaaaaa";

    private JwtProvider tokenMinter;
    private JwtAuthenticationFilter filter;
    private GatewayFilterChain chain;

    @BeforeEach
    void setUp() {
        tokenMinter = new JwtProvider(SECRET, SECRET, 900_000, 1_209_600_000);
        filter = new JwtAuthenticationFilter(new JwtProvider(SECRET));
        chain = mock(GatewayFilterChain.class);
        when(chain.filter(any())).thenReturn(Mono.empty());
    }

    private ServerWebExchange forwarded() {
        ArgumentCaptor<ServerWebExchange> captor = ArgumentCaptor.forClass(ServerWebExchange.class);
        verify(chain).filter(captor.capture());
        return captor.getValue();
    }

    @Test
    void 회원가입은_토큰_없이_통과한다() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.post("/api/auth/signup"));

        filter.filter(exchange, chain).block();

        verify(chain).filter(any());
        HttpHeaders h = forwarded().getRequest().getHeaders();
        assertThat(h.getFirst("X-User-Id")).isNull();
        assertThat(h.getFirst("X-User-Role")).isNull();
    }

    @Test
    void 방문예약_신청은_토큰_없으면_401이고_통과하지_않는다() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.post("/api/customer/reservations"));

        filter.filter(exchange, chain).block();

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(exchange.getResponse().getHeaders().getFirst(HttpHeaders.WWW_AUTHENTICATE)).isEqualTo("Bearer ");
        verify(chain, never()).filter(any());
    }

    @Test
    void 내_입장권_조회도_토큰_없으면_401이고_통과하지_않는다() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/customer/reservations"));

        filter.filter(exchange, chain).block();

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        verify(chain, never()).filter(any());
    }

    @Test
    void 유효한_USER_토큰이면_방문예약_신청이_통과하고_신원헤더가_주입된다() {
        String token = tokenMinter.createAccessToken(9001L, "USER");
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.post("/api/customer/reservations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token));

        filter.filter(exchange, chain).block();

        verify(chain).filter(any());
        HttpHeaders h = forwarded().getRequest().getHeaders();
        assertThat(h.getFirst("X-User-Id")).isEqualTo("9001");
        assertThat(h.getFirst("X-User-Role")).isEqualTo("USER");
    }

    // 클라이언트가 X-User-Role: ADMIN을 직접 보내도, Gateway는 토큰에서 꺼낸 값(USER)으로 덮어써서 넘긴다 —
    // 역할 위조로 하위 서비스의 USER 전용 라우트를 속일 수 없어야 함.
    @Test
    void 클라이언트가_위조한_역할_헤더는_토큰의_실제_역할로_덮인다() {
        String token = tokenMinter.createAccessToken(9001L, "USER");
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.post("/api/customer/reservations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .header("X-User-Id", "1")
                        .header("X-User-Role", "ADMIN"));

        filter.filter(exchange, chain).block();

        HttpHeaders h = forwarded().getRequest().getHeaders();
        assertThat(h.getFirst("X-User-Id")).isEqualTo("9001");
        assertThat(h.getFirst("X-User-Role")).isEqualTo("USER");
    }

    @Test
    void 만료된_토큰으로_방문예약_신청하면_401이고_재인증을_요구한다() {
        String expired = new JwtProvider(SECRET, SECRET, -1000, -1000)
                .createAccessToken(9001L, "USER");
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.post("/api/customer/reservations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + expired));

        filter.filter(exchange, chain).block();

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(exchange.getResponse().getHeaders().getFirst(HttpHeaders.WWW_AUTHENTICATE)).isEqualTo("Bearer ");
        verify(chain, never()).filter(any());
    }
}
