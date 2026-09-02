package com.team4.expo.repository;

import com.team4.expo.domain.ApplicationStatus;
import com.team4.expo.domain.BoothApplication;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BoothApplicationRepository extends JpaRepository<BoothApplication, Long> {

    boolean existsByBooth_IdAndExhibitorIdAndStatusIn(Long boothId, Long exhibitorId, List<ApplicationStatus> statuses);
}