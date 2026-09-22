package com.team4.identity.user;

import com.team4.identity.user.domain.User;
import com.team4.identity.user.domain.UserStatus;
import com.team4.identity.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 관리자 회원 조회(목록/검색/상세) + 정지/정지해제 API 테스트. 역할 변경·강제 탈퇴는 스코프 밖
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("관리자 회원 조회")
class AdminUserControllerAcceptanceTest {

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired PasswordEncoder passwordEncoder;

    private static RequestPostProcessor admin(long userId) {
        return headers(String.valueOf(userId), "ADMIN");
    }

    private static RequestPostProcessor user(long userId) {
        return headers(String.valueOf(userId), "USER");
    }

    private static RequestPostProcessor headers(String userId, String role) {
        return request -> {
            request.addHeader("X-User-Id", userId);
            request.addHeader("X-User-Role", role);
            return request;
        };
    }

    private long adminId;

    @BeforeEach
    void clean() {
        userRepository.deleteAllInBatch();
        adminId = userRepository.save(User.createAdmin("admin@test.com", "hash")).getId();
    }

    // ---------------------------------------------------------------------
    // GET /api/admin/users - 목록/검색/필터
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("관리자는 전체 회원 목록을 조회할 수 있다")
    void 관리자_회원목록_조회() throws Exception {
        userRepository.save(User.createMember("user1@test.com", "hash", "김도윤", "01011112222"));
        userRepository.save(User.createExhibitor("ex1@test.com", "hash", "1234567890",
                "테스트모터스", "담당자", "01033334444", "서울", "완성차", "대표", "0212345678"));

        mockMvc.perform(get("/api/admin/users").with(admin(adminId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(3)); // admin 계정 포함
    }

    @Test
    @DisplayName("keyword로 이메일/이름/회사명을 검색할 수 있다")
    void 회원_검색() throws Exception {
        userRepository.save(User.createMember("user1@test.com", "hash", "김도윤", "01011112222"));
        userRepository.save(User.createExhibitor("ex1@test.com", "hash", "1234567890",
                "블루웨이브모터스", "담당자", "01033334444", "서울", "완성차", "대표", "0212345678"));

        mockMvc.perform(get("/api/admin/users").param("keyword", "블루웨이브").with(admin(adminId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].email").value("ex1@test.com"));
    }

    @Test
    @DisplayName("role로 필터링할 수 있다")
    void 역할_필터() throws Exception {
        userRepository.save(User.createMember("user1@test.com", "hash", "김도윤", "01011112222"));
        userRepository.save(User.createExhibitor("ex1@test.com", "hash", "1234567890",
                "테스트모터스", "담당자", "01033334444", "서울", "완성차", "대표", "0212345678"));

        mockMvc.perform(get("/api/admin/users").param("role", "EXHIBITOR").with(admin(adminId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].role").value("EXHIBITOR"));
    }

    @Test
    @DisplayName("USER 역할 토큰으로 회원 목록을 조회하면 403")
    void 일반회원이_회원목록_조회시_403() throws Exception {
        long memberId = userRepository.save(User.createMember("user1@test.com", "hash", "김도윤", "01011112222")).getId();

        mockMvc.perform(get("/api/admin/users").with(user(memberId)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("인증 헤더 없이 회원 목록을 조회하면 401")
    void 인증없이_회원목록_조회시_401() throws Exception {
        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isUnauthorized());
    }

    // ---------------------------------------------------------------------
    // GET /api/admin/users/{id} - 상세 조회
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("관리자는 회원 상세 정보를 조회할 수 있다")
    void 관리자_회원상세_조회() throws Exception {
        long targetId = userRepository.save(User.createExhibitor("ex1@test.com", "hash", "1234567890",
                "테스트모터스", "담당자", "01033334444", "서울", "완성차", "대표", "0212345678")).getId();

        mockMvc.perform(get("/api/admin/users/{id}", targetId).with(admin(adminId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value("ex1@test.com"))
                .andExpect(jsonPath("$.data.companyName").value("테스트모터스"))
                .andExpect(jsonPath("$.data.businessNo").value("1234567890"));
    }

    @Test
    @DisplayName("없는 회원을 상세 조회하면 404")
    void 없는_회원_상세조회_404() throws Exception {
        mockMvc.perform(get("/api/admin/users/{id}", 999_999L).with(admin(adminId)))
                .andExpect(status().isNotFound());
    }

    // ---------------------------------------------------------------------
    // PATCH /api/admin/users/{id}/status - 정지/정지 해제
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("회원을 정지하면 상태가 LOCKED로 바뀌고, 그 계정은(비밀번호가 맞아도) 로그인할 수 없다")
    void 회원_정지() throws Exception {
        long targetId = userRepository.save(User.createMember("locktarget@test.com",
                passwordEncoder.encode("password123"), "김도윤", "01011112222")).getId();

        mockMvc.perform(patch("/api/admin/users/{id}/status", targetId).with(admin(adminId))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"LOCKED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("LOCKED"));

        mockMvc.perform(post("/api/auth/signin").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"locktarget@test.com\",\"password\":\"password123\",\"rememberMe\":false}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.message").value("정지된 계정입니다."));
    }

    @Test
    @DisplayName("정지된 회원을 정지 해제하면 다시 활성 상태가 된다")
    void 정지_해제() throws Exception {
        User target = userRepository.save(User.createMember("unlocktarget@test.com", "hash", "이서연", "01022223333"));
        target.lock();
        userRepository.save(target);

        mockMvc.perform(patch("/api/admin/users/{id}/status", target.getId()).with(admin(adminId))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"ACTIVE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    @Test
    @DisplayName("관리자 계정은 정지할 수 없다 (403)")
    void 관리자_계정_정지_불가() throws Exception {
        long otherAdminId = userRepository.save(User.createAdmin("admin2@test.com", "hash")).getId();

        mockMvc.perform(patch("/api/admin/users/{id}/status", otherAdminId).with(admin(adminId))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"LOCKED\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("탈퇴한 회원은 상태를 변경할 수 없다 (409)")
    void 탈퇴한_회원_상태변경_불가() throws Exception {
        User target = userRepository.save(User.createMember("withdrawn@test.com", "hash", "박지훈", "01033334444"));
        target.withdraw();
        userRepository.save(target);

        mockMvc.perform(patch("/api/admin/users/{id}/status", target.getId()).with(admin(adminId))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"ACTIVE\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("WITHDRAWN으로의 강제 상태 변경은 400")
    void withdrawn으로_강제변경_400() throws Exception {
        long targetId = userRepository.save(User.createMember("target2@test.com", "hash", "최유나", "01044445555")).getId();

        mockMvc.perform(patch("/api/admin/users/{id}/status", targetId).with(admin(adminId))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"WITHDRAWN\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("USER 역할 토큰으로 상태 변경을 시도하면 403")
    void 일반회원이_상태변경_시도시_403() throws Exception {
        long targetId = userRepository.save(User.createMember("target3@test.com", "hash", "정하늘", "01055556666")).getId();
        long callerId = userRepository.save(User.createMember("caller@test.com", "hash", "오세준", "01066667777")).getId();

        mockMvc.perform(patch("/api/admin/users/{id}/status", targetId).with(user(callerId))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"LOCKED\"}"))
                .andExpect(status().isForbidden());
    }
}
