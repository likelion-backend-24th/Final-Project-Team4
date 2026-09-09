package com.team4.gateway.filter;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// TASK 5-4 - Gateway가 모든 요청에 X-Trace-Id를 보장하고 하위 서비스로 전파하는지 테스트
class TraceIdFilterTest {

    private static final String HEADER = "X-Trace-Id";

    private TraceIdFilter filter;
    private GatewayFilterChain chain;

    @BeforeEach
    void setUp() {
        filter = new TraceIdFilter();
        chain = mock(GatewayFilterChain.class);
        when(chain.filter(any())).thenReturn(Mono.empty());
    }

    private ServerWebExchange forwarded() {
        ArgumentCaptor<ServerWebExchange> captor = ArgumentCaptor.forClass(ServerWebExchange.class);
        verify(chain).filter(captor.capture());
        return captor.getValue();
    }

    @Test
    void 트레이스ID_헤더가_없으면_생성해서_하위서비스와_응답에_실는다() {
        MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest.get("/api/customer/reservations"));

        filter.filter(exchange, chain).block();

        String downstream = forwarded().getRequest().getHeaders().getFirst(HEADER);
        assertThat(downstream).isNotBlank();
        assertThat(exchange.getResponse().getHeaders().getFirst(HEADER)).isEqualTo(downstream);
    }

    @Test
    void 클라이언트가_보낸_트레이스ID는_그대로_전파한다() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/customer/reservations")
                .header(HEADER, "trace-abc-123"));

        filter.filter(exchange, chain).block();

        assertThat(forwarded().getRequest().getHeaders().getFirst(HEADER)).isEqualTo("trace-abc-123");
        assertThat(exchange.getResponse().getHeaders().getFirst(HEADER)).isEqualTo("trace-abc-123");
    }

    @Test
    void JwtAuthenticationFilter보다_먼저_실행된다() {
        assertThat(filter.getOrder()).isLessThan(new JwtAuthenticationFilter(null).getOrder());
    }
}
