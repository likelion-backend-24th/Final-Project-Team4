package com.team4.identity.user.repository;

import com.team4.identity.user.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByBusinessNo(String businessNo);

    boolean existsByEmail(String email);

    boolean existsByBusinessNo(String businessNo);
}
