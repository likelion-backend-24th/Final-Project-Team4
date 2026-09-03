package com.team4.expo.repository;

import com.team4.expo.domain.ApplicationStatus;
import com.team4.expo.domain.BoothApplication;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BoothApplicationRepository extends JpaRepository<BoothApplication, Long> {

    // "동일 부스 + 동일 업체 + 진행 중인 상태(SUBMITTED/PAYMENT_PENDING/CONFIRMED)"의 신청이 있는지 확인
    boolean existsByBooth_IdAndExhibitorIdAndStatusIn(Long boothId, Long exhibitorId, List<ApplicationStatus> statuses);

    // 그룹에 속한 모든 부스 신청 조회 (제출/취소 시 그룹 단위 처리에 사용)
    List<BoothApplication> findByGroup_Id(String groupId);

    // 박람회 하나에 속한 모든 부스 신청 조회 (Admin 통계·부스 배치도 집계용)
    List<BoothApplication> findByBooth_Expo_Id(Long expoId);
}
