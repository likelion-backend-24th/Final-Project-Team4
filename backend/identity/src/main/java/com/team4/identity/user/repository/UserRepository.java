package com.team4.identity.user.repository;

import com.team4.identity.user.domain.Role;
import com.team4.identity.user.domain.User;
import com.team4.identity.user.domain.UserStatus;
import java.time.LocalDateTime;
import java.util.List;
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

    // 관리자 회원 목록 조회 - 이메일/이름/회사명/담당자명/연락처 keyword 검색 + role/status 필터(전부 선택)
    // + 가입일(signupFrom~signupTo) 기간 필터(전부 선택) - "전체 기간"이면 둘 다 null로 넘어옴.
    @Query("""
            SELECT u FROM User u
            WHERE (:keyword IS NULL OR u.email LIKE CONCAT('%', :keyword, '%')
                OR u.name LIKE CONCAT('%', :keyword, '%')
                OR u.companyName LIKE CONCAT('%', :keyword, '%')
                OR u.managerName LIKE CONCAT('%', :keyword, '%')
                OR u.contact LIKE CONCAT('%', :keyword, '%'))
            AND (:role IS NULL OR u.role = :role)
            AND (:status IS NULL OR u.status = :status)
            AND (:signupFrom IS NULL OR u.createdAt >= :signupFrom)
            AND (:signupTo IS NULL OR u.createdAt < :signupTo)
            """)
    Page<User> search(@Param("keyword") String keyword, @Param("role") Role role,
                      @Param("status") UserStatus status,
                      @Param("signupFrom") LocalDateTime signupFrom, @Param("signupTo") LocalDateTime signupTo,
                      Pageable pageable);

    // 엑셀 다운로드용 - 위 search()와 조건은 동일하되 페이징 없이 전체를 반환(가입일 오름차순).
    @Query("""
            SELECT u FROM User u
            WHERE (:keyword IS NULL OR u.email LIKE CONCAT('%', :keyword, '%')
                OR u.name LIKE CONCAT('%', :keyword, '%')
                OR u.companyName LIKE CONCAT('%', :keyword, '%')
                OR u.managerName LIKE CONCAT('%', :keyword, '%')
                OR u.contact LIKE CONCAT('%', :keyword, '%'))
            AND (:role IS NULL OR u.role = :role)
            AND (:status IS NULL OR u.status = :status)
            AND (:signupFrom IS NULL OR u.createdAt >= :signupFrom)
            AND (:signupTo IS NULL OR u.createdAt < :signupTo)
            ORDER BY u.createdAt ASC
            """)
    List<User> searchAll(@Param("keyword") String keyword, @Param("role") Role role,
                         @Param("status") UserStatus status,
                         @Param("signupFrom") LocalDateTime signupFrom, @Param("signupTo") LocalDateTime signupTo);

    long countByRole(Role role);

    long countByRoleAndStatus(Role role, UserStatus status);

    long countByRoleAndCreatedAtBetween(Role role, LocalDateTime from, LocalDateTime to);

    // 참가업체 통계 카드("참가중"/"미참가" 집계)용 - 활성 업체 id 전체를 모아 Expo에 한 번에 물어보기 위함.
    @Query("SELECT u.id FROM User u WHERE u.role = :role AND u.status = :status")
    List<Long> findIdsByRoleAndStatus(@Param("role") Role role, @Param("status") UserStatus status);
}