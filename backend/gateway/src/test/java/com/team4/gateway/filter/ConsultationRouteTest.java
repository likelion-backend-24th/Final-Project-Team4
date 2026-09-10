package com.team4.gateway.filter;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.cloud.gateway.route.Route;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.net.URI;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

// TASK 6-2(#124): /api/customer/consultations가 기존 "/api/customer/**" catch-all(Reservation) 라우트에
// 잡히지 않고 Expo로 가는지, application.yml에 실제로 정의된 라우트 목록을 로딩해 검증한다.
@SpringBootTest
@TestPropertySource(properties = "jwt.access-key=test-access-key-long-enough-for-hs256-aaaaaaaaaaaa")
class ConsultationRouteTest {

    @org.springframework.beans.factory.annotation.Autowired
    private RouteLocator routeLocator;

    // Spring Cloud Gateway는 route 목록을 정의 순서대로 평가해 predicate를 만족하는 첫 라우트로 보낸다.
    private Route resolve(ServerWebExchange exchange) {
        List<Route> routes = routeLocator.getRoutes().collectList().block();
        return routes.stream()
                .filter(route -> Boolean.TRUE.equals(Mono.from(route.getPredicate().apply(exchange)).block()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("매칭되는 라우트 없음: " + exchange.getRequest().getURI()));
    }

    private ServerWebExchange exchangeFor(String path) {
        return MockServerWebExchange.from(MockServerHttpRequest.get(path));
    }

    @Test
    void 고객_상담_신청_경로는_Reservation이_아니라_Expo로_라우팅된다() {
        Route route = resolve(exchangeFor("/api/customer/consultations"));

        assertThat(route.getId()).isEqualTo("expo-customer");
        assertThat(route.getUri()).isEqualTo(URI.create("http://localhost:8082"));
    }

    @Test
    void 고객_상담_신청_하위경로도_Expo로_라우팅된다() {
        Route route = resolve(exchangeFor("/api/customer/consultations/123"));

        assertThat(route.getId()).isEqualTo("expo-customer");
    }

    @Test
    void 고객_방문예약_신청은_여전히_Reservation으로_라우팅된다() {
        Route route = resolve(exchangeFor("/api/customer/reservations"));

        assertThat(route.getId()).isEqualTo("reservation");
        assertThat(route.getUri()).isEqualTo(URI.create("http://localhost:8084"));
    }

    @Test
    void 참가업체_상담_신청_경로는_회귀없이_Expo로_라우팅된다() {
        Route route = resolve(exchangeFor("/api/exhibitor/consultations"));

        assertThat(route.getId()).isEqualTo("expo");
        assertThat(route.getUri()).isEqualTo(URI.create("http://localhost:8082"));
    }
}
