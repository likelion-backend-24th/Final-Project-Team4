package com.team4.expo.consultation.repository;

import com.team4.expo.consultation.domain.ConsultationSlotCapacity;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ConsultationSlotCapacityRepository extends JpaRepository<ConsultationSlotCapacity, Long> {

    List<ConsultationSlotCapacity> findByBooth_IdOrderBySlotDateAscSlotTimeAsc(Long boothId);

    List<ConsultationSlotCapacity> findByBooth_IdAndSlotDate(Long boothId, LocalDate slotDate);

    Optional<ConsultationSlotCapacity> findByBooth_IdAndSlotDateAndSlotTime(Long boothId, LocalDate slotDate, LocalTime slotTime);

    // 전체 교체 저장용. 파생 삭제(deleteBy...)는 flush 시 INSERT가 DELETE보다 먼저 나가 유니크 키에 걸리므로 즉시 실행되는 벌크 삭제를 쓴다.
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM ConsultationSlotCapacity s WHERE s.booth.id = :boothId")
    void deleteAllByBoothId(@Param("boothId") Long boothId);
}
