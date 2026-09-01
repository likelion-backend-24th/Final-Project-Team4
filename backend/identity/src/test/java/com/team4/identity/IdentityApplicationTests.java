package com.team4.identity;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class IdentityApplicationTests {

    @Autowired
    JdbcTemplate jdbcTemplate;

    @Autowired
    StringRedisTemplate redis;

    @Test
    void contextLoads() {
    }

    @Test
    void flywayCreatesIdentitySchema() {
        Integer tables = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables " +
                        "WHERE table_schema = 'identity_test' AND table_name IN ('users', 'user_roles')",
                Integer.class);

        assertThat(tables).isEqualTo(2);
    }

    @Test
    void redisRoundTrip() {
        redis.opsForValue().set("test:ping", "pong", Duration.ofSeconds(10));

        assertThat(redis.opsForValue().get("test:ping")).isEqualTo("pong");
    }
}
