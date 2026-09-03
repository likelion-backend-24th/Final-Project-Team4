package com.team4.gateway.filter;

import com.team4.common.jwt.JwtProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class JwtAuthenticationFilterTest {

    private static final String SECRET = "test-access-key-long-enough-for-hs256-aaaaaaaaaaaa";

    private JwtProvider tokenMinter;          // 테스트용 토큰 발급
    private JwtAuthenticationFilter filter;
    private GatewayFilterChain chain;

    @BeforeEach
    void setUp() {
        tokenMinter = new JwtProvider(SECRET, SECRET, 900_000, 1_209_600_000);
        filter = new JwtAuthenticationFilter(new JwtProvider(SECRET)); // 검증 전용
        chain = mock(GatewayFilterChain.class);
        when(chain.filter(any())).thenReturn(Mono.empty());
    }

    // chain 으로 전달된 exchange 캡처
    private ServerWebExchange forwarded() {
        ArgumentCaptor<ServerWebExchange> captor = ArgumentCaptor.forClass(ServerWebExchange.class);
        verify(chain).filter(captor.capture());
        return captor.getValue();
    }

    @Test
    void 유효한_토큰이면_X_User_헤더를_주입하고_통과시킨다() {
        String token = tokenMinter.createAccessToken(42L, "EXHIBITOR");
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/exhibitor/expos")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token));

        filter.filter(exchange, chain).block();

        HttpHeaders h = forwarded().getRequest().getHeaders();
        assertThat(h.getFirst("X-User-Id")).isEqualTo("42");
        assertThat(h.getFirst("X-User-Role")).isEqualTo("EXHIBITOR");
    }

    @Test
    void 클라이언트가_위조한_X_User_헤더는_토큰_값으로_덮인다() {
        String token = tokenMinter.createAccessToken(42L, "EXHIBITOR");
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/exhibitor/expos")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .header("X-User-Id", "999")
                        .header("X-User-Role", "ADMIN"));

        filter.filter(exchange, chain).block();

        HttpHeaders h = forwarded().getRequest().getHeaders();
        assertThat(h.getFirst("X-User-Id")).isEqualTo("42");
        assertThat(h.getFirst("X-User-Role")).isEqualTo("EXHIBITOR");
    }

    @Test
    void 토큰이_없고_보호_경로면_401_이고_통과하지_않는다() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/exhibitor/expos"));

        filter.filter(exchange, chain).block();

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        verify(chain, never()).filter(any());
    }

    @Test
    void 토큰이_없어도_화이트리스트_경로면_통과하고_신원헤더는_없다() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.post("/api/auth/login"));

        filter.filter(exchange, chain).block();

        HttpHeaders h = forwarded().getRequest().getHeaders();
        assertThat(h.getFirst("X-User-Id")).isNull();
        assertThat(h.getFirst("X-User-Role")).isNull();
    }

    @Test
    void 형식이_깨진_토큰이면_401() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/exhibitor/expos")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer not.a.jwt"));

        filter.filter(exchange, chain).block();

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void 만료된_토큰이면_401() {
        String expired = new JwtProvider(SECRET, SECRET, -1000, -1000)
                .createAccessToken(42L, "EXHIBITOR");
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/exhibitor/expos")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + expired));

        filter.filter(exchange, chain).block();

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void OPTIONS_preflight는_검증없이_통과() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.method(HttpMethod.OPTIONS, "/api/exhibitor/expos"));

        filter.filter(exchange, chain).block();

        verify(chain).filter(any());
    }
}