package com.team4.reservation.repository;

import com.team4.reservation.domain.CheckIn;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CheckInRepository extends JpaRepository<CheckIn, Long> {

    // 통계용 - 일별 체크인 수(체크인 시각 checked_in_at 기준)
    @Query(value = "SELECT DATE(c.checked_in_at) AS day, COUNT(*) AS cnt, " +
            "COUNT(CASE WHEN t.ticket_type = 'FREE' THEN 1 END) AS free, " +
            "COUNT(CASE WHEN t.ticket_type = 'PAID' THEN 1 END) AS paid " +
            "FROM check_ins c LEFT JOIN tickets t ON t.id = c.ticket_id " +
            "WHERE c.expo_id = :expoId AND c.checked_in_at >= :from AND c.checked_in_at < :toExclusive " +
            "GROUP BY DATE(c.checked_in_at) ORDER BY DATE(c.checked_in_at)", nativeQuery = true)
    List<DailyCount> findDailyByExpoId(@Param("expoId") Long expoId, @Param("from") LocalDateTime from, @Param("toExclusive") LocalDateTime toExclusive);

    // 통계용 - 시간대별 체크인 수(체크인이 있었던 시간대 반환)
    @Query(value = "SELECT HOUR(c.checked_in_at) AS hour, COUNT(*) AS cnt, " +
            "COUNT(CASE WHEN t.ticket_type = 'FREE' THEN 1 END) AS free, " +
            "COUNT(CASE WHEN t.ticket_type = 'PAID' THEN 1 END) AS paid " +
            "FROM check_ins c LEFT JOIN tickets t ON t.id = c.ticket_id " +
            "WHERE c.expo_id = :expoId AND c.checked_in_at >= :from AND c.checked_in_at < :toExclusive " +
            "GROUP BY HOUR(c.checked_in_at) ORDER BY HOUR(c.checked_in_at)", nativeQuery = true)
    List<HourlyCount> findHourlyByExpoId(@Param("expoId") Long expoId, @Param("from") LocalDateTime from, @Param("toExclusive") LocalDateTime toExclusive);
}
