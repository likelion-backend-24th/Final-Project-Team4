package com.team4.reservation.controller;

import com.team4.common.response.ApiResponse;
import com.team4.reservation.dto.DailyCheckInResponse;
import com.team4.reservation.dto.HourlyCheckInResponse;
import com.team4.reservation.dto.TicketStatsResponse;
import com.team4.reservation.service.ReservationStatsService;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// 관리자 대시보드 통계
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/reservation/stats")
public class ReservationAdminController {

    private final ReservationStatsService statsService;

    // 일별 체크인 수(방문자 수)
    @GetMapping("/check-ins")
    public ResponseEntity<ApiResponse<List<DailyCheckInResponse>>> getDailyCheckIns(@RequestParam Long expoId,
                                                                                    @RequestParam LocalDate from,
                                                                                    @RequestParam LocalDate to) {

        return ResponseEntity.ok(ApiResponse.success(statsService.getDailyCheckIns(expoId, from, to)));
    }

    // 하루 시간대별 체크인 수
    @GetMapping("/hourly")
    public ResponseEntity<ApiResponse<List<HourlyCheckInResponse>>> getHourlyCheckIns(@RequestParam Long expoId,
                                                                                      @RequestParam LocalDate date) {

        return ResponseEntity.ok(ApiResponse.success(statsService.getHourlyCheckIns(expoId, date)));
    }

    // 입장권 현황(무료/유료 발급 수, 체크인 완료 수)
    @GetMapping("/tickets")
    public ResponseEntity<ApiResponse<TicketStatsResponse>> getTicketStats(@RequestParam Long expoId) {

        return ResponseEntity.ok(ApiResponse.success(statsService.getTicketStats(expoId)));
    }
}
