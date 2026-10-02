package com.team4.identity.user;

import com.team4.identity.user.domain.User;
import com.team4.identity.user.domain.UserStatus;
import com.team4.identity.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

// 회원 탈퇴 시 개인정보 익명화
@SpringBootTest
@ActiveProfiles("test")
class UserWithdrawTest {

    @Autowired
    UserRepository userRepository;

    @BeforeEach
    void clean() {
        userRepository.deleteAllInBatch();
    }

    @Test
    void 탈퇴하면_개인정보가_지워지고_같은_이메일로_재가입할_수_있다() {
        User user = userRepository.save(
                User.createExhibitor(
                        "manager@corp.com",
                        "hash",
                        "123-45-67890",
                        "코퍼레이션",
                        "KJH",
                        "010-1234-5678",
                        "서울시 강남구",
                        "전기차 부품 제조",
                        "이대표",
                        "02-1234-5678"
                )
        );

        user.withdraw();
        userRepository.saveAndFlush(user);

        User withdrawn = userRepository.findById(user.getId()).orElseThrow();
        assertThat(withdrawn.getStatus()).isEqualTo(UserStatus.WITHDRAWN);
        assertThat(withdrawn.getEmail()).isEqualTo("withdrawn_" + user.getId() + "@deleted.local");
        assertThat(withdrawn.getPasswordHash()).isNull();
        assertThat(withdrawn.getContact()).isNull();
        assertThat(withdrawn.getManagerName()).isNull();
        assertThat(withdrawn.getBusinessNo()).isNull();
        assertThat(withdrawn.getCompanyName()).isEqualTo("코퍼레이션");

        // 이메일, 사업자번호 unique 제약이 풀려서 같은 값으로 다시 가입 가능
        userRepository.saveAndFlush(User.createExhibitor("manager@corp.com", "hash", "123-45-67890",
                "코퍼레이션", "KJH", "010-1234-5678", "서울시 강남구", "전기차 부품 제조", "이대표", "02-1234-5678"));
    }
}
