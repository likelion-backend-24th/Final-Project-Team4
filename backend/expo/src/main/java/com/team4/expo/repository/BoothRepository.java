package com.team4.expo.repository;

import com.team4.expo.domain.Booth;
import com.team4.expo.domain.BoothStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BoothRepository extends JpaRepository<Booth, Long> {

    List<Booth> findByExpo_IdOrderByBoothNo(Long expoId);

    long countByExpo_IdAndStatus(Long expoId, BoothStatus status);

    // 상담 정원 확인~저장 사이에 같은 슬롯으로 동시에 신청이 들어와 정원을 넘기지 않도록 부스 행을 잠근다.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Booth b WHERE b.id = :id")
    Optional<Booth> findByIdForUpdate(@Param("id") Long id);
}
