package com.team4.expo.repository;

import com.team4.expo.domain.BoothApplicationGroup;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BoothApplicationGroupRepository extends JpaRepository<BoothApplicationGroup, String> {

    // 마이페이지 - 본인이 신청한 그룹만, 최신순
    Page<BoothApplicationGroup> findByExhibitorIdOrderByCreatedAtDesc(Long exhibitorId, Pageable pageable);

    // Admin - 전체 그룹, 최신순
    Page<BoothApplicationGroup> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
