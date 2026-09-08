package com.team4.expo.repository;

import com.team4.expo.domain.Booth;
import com.team4.expo.domain.BoothStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BoothRepository extends JpaRepository<Booth, Long> {

    List<Booth> findByExpo_IdOrderByBoothNo(Long expoId);

    long countByExpo_IdAndStatus(Long expoId, BoothStatus status);
}