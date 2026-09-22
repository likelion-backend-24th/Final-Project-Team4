package com.team4.reservation.service;

import com.team4.reservation.client.IdentityClient;
import com.team4.reservation.domain.TicketStatus;
import com.team4.reservation.domain.TicketType;
import com.team4.reservation.dto.CheckInLogResponse;
import com.team4.reservation.dto.DailyCheckInResponse;
import com.team4.reservation.dto.HourlyCheckInResponse;
import com.team4.reservation.dto.TicketStatsResponse;
import com.team4.reservation.repository.CheckInLog;
import com.team4.reservation.repository.CheckInRepository;
import com.team4.reservation.repository.TicketRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 관리자 대시보드용 체크인, 입장권 통계
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReservationStatsService {

    private final CheckInRepository checkInRepository;
    private final TicketRepository ticketRepository;
    private final IdentityClient identityClient;

    // 일별 체크인 수
    public List<DailyCheckInResponse> getDailyCheckIns(Long expoId, LocalDate from, LocalDate to) {
        return checkInRepository.findDailyByExpoId(expoId, from.atStartOfDay(), to.plusDays(1).atStartOfDay()).stream()
                .map(r -> new DailyCheckInResponse(r.getDay(), r.getCnt(), r.getFree(), r.getPaid()))
                .toList();
    }

    // 하루 안에서 시간대별 체크인 수
    public List<HourlyCheckInResponse> getHourlyCheckIns(Long expoId, LocalDate date) {
        return checkInRepository.findHourlyByExpoId(expoId, date.atStartOfDay(), date.plusDays(1).atStartOfDay()).stream()
                .map(r -> new HourlyCheckInResponse(r.getHour(), r.getCnt(), r.getFree(), r.getPaid()))
                .toList();
    }

    // 하루치 입장 현황 목록(최근 체크인부터)
    public List<CheckInLogResponse> getCheckInLogs(Long expoId, LocalDate date) {
        List<CheckInLog> rows = checkInRepository.findRecentByExpoId(
                expoId,
                date.atStartOfDay(),
                date.plusDays(1).atStartOfDay(),
                PageRequest.of(0, 20)
        );

        // Identity에서 이름 한번에 갖고오기
        Map<Long, String> names = identityClient.getUserNames(
                rows.stream()
                        .map(CheckInLog::getCustomerId)
                        .distinct()
                        .toList()
        );

        return rows.stream()
                // 탈퇴 등으로 이름 못 찾았을때 목록에 '-'으로 이름 표시 (임시)
                .map(r -> new CheckInLogResponse(r.getCheckedInAt(), names.getOrDefault(r.getCustomerId(), "-"), r.getTicketType()))
                .toList();
    }

    // 입장권 현황
    public TicketStatsResponse getTicketStats(Long expoId) {
        return new TicketStatsResponse(
                ticketRepository.countByExpoIdAndTicketTypeAndStatusNot(expoId, TicketType.FREE, TicketStatus.CANCELLED),
                ticketRepository.countByExpoIdAndTicketTypeAndStatusNot(expoId, TicketType.PAID, TicketStatus.CANCELLED),
                ticketRepository.countByExpoIdAndStatus(expoId, TicketStatus.USED)
        );
    }
}
