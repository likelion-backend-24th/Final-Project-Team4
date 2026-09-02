package com.team4.expo.repository;

import com.team4.expo.domain.ApplicationStatus;
import com.team4.expo.domain.BoothApplication;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BoothApplicationRepository extends JpaRepository<BoothApplication, Long> {

    // "동일 부스 + 동일 업체 + 진행 중인 상태(SUBMITTED/PAYMENT_PENDING/CONFIRMED)"의 신청이 있는지 확인
    boolean existsByBooth_IdAndExhibitorIdAndStatusIn(Long boothId, Long exhibitorId, List<ApplicationStatus> statuses);
}