package com.team4.expo.expo.repository;

import com.team4.expo.expo.domain.Expo;
import com.team4.expo.expo.domain.ExpoStatus;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExpoRepository extends JpaRepository<Expo, Long> {

    // open 상태 박람회 목록 페이징 조회
    Page<Expo> findByStatus(ExpoStatus status, Pageable pageable);

    // 자연어 차량 검색 - 검색 후보를 모을 OPEN 박람회 전체
    List<Expo> findByStatus(ExpoStatus status);
}