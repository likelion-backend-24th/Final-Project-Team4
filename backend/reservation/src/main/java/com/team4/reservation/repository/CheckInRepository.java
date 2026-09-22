package com.team4.reservation.repository;

import com.team4.reservation.domain.CheckIn;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Pageable;
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

    // 통계용 - 관리자 입장 현황 목록 (최근 체크인순). SELECT의 별칭(AS)이 CheckInLog의 getter 이름과 맞아야 함
    @Query("SELECT c.checkedInAt AS checkedInAt, t.customerId AS customerId, t.ticketType AS ticketType " +
            "FROM CheckIn c, Ticket t " +
            "WHERE t.id = c.ticketId AND c.expoId = :expoId " +
            "AND c.checkedInAt >= :from AND c.checkedInAt < :toExclusive " +
            "ORDER BY c.checkedInAt DESC")
    List<CheckInLog> findRecentByExpoId(@Param("expoId") Long expoId, @Param("from") LocalDateTime from, @Param("toExclusive") LocalDateTime toExclusive, Pageable pageable);
}
