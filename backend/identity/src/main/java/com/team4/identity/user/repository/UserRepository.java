package com.team4.identity.user.repository;

import com.team4.identity.user.domain.Role;
import com.team4.identity.user.domain.User;
import com.team4.identity.user.domain.UserStatus;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByBusinessNo(String businessNo);

    // 관리자 회원 목록 조회 - 이메일/이름/회사명 keyword 검색 + role/status 필터(전부 선택)
    @Query("""
            SELECT u FROM User u
            WHERE (:keyword IS NULL OR u.email LIKE CONCAT('%', :keyword, '%')
                OR u.name LIKE CONCAT('%', :keyword, '%')
                OR u.companyName LIKE CONCAT('%', :keyword, '%'))
            AND (:role IS NULL OR u.role = :role)
            AND (:status IS NULL OR u.status = :status)
            """)
    Page<User> search(@Param("keyword") String keyword, @Param("role") Role role,
                       @Param("status") UserStatus status, Pageable pageable);
}
