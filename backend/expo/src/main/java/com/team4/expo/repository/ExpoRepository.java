package com.team4.expo.repository;

import com.team4.expo.domain.Expo;
import com.team4.expo.domain.ExpoStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExpoRepository extends JpaRepository<Expo, Long> {

    // open 상태 박람회 목록 페이징 조회
    Page<Expo> findByStatus(ExpoStatus status, Pageable pageable);
}