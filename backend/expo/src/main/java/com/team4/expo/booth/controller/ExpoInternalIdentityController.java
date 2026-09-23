package com.team4.expo.booth.controller;


import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.common.response.ApiResponse;
import com.team4.expo.booth.dto.ExhibitorApplicationStatsResponse;
import com.team4.expo.booth.service.ExhibitorStatsService;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// 서비스 간 내부 API. Gateway·OpenAPI에 노출하지 않음 - 호출자별 SVC_TOKEN Bearer로만 검증(사용자 토큰/Role 미사용).
@RestController
@RequestMapping("/internal/expo/exhibitors")
public class ExpoInternalIdentityController {

    private final ExhibitorStatsService exhibitorStatsService;

    @Value("${service.token.identity}")
    private String identityServiceToken;

    public ExpoInternalIdentityController(ExhibitorStatsService exhibitorStatsService) {
        this.exhibitorStatsService = exhibitorStatsService;
    }

    // Identity -> Expo. 관리자 회원(참가업체) 목록/엑셀/통계 화면 - 여러 업체의 참가 신청 건수·참가 여부를 한 번에 조회.
    // GET 대신 POST + body를 쓴 이유: 페이지 하나에 최대 수백 명 분량 exhibitorId를 보낼 수 있어 쿼리스트링으로는 부적합.
    @PostMapping("/application-stats")
    public ResponseEntity<ApiResponse<List<ExhibitorApplicationStatsResponse>>> getApplicationStats(
            @RequestHeader("Authorization") String authorization,
            @RequestBody List<Long> exhibitorIds) {

        requireIdentityService(authorization);

        return ResponseEntity.ok(ApiResponse.success(exhibitorStatsService.getApplicationStats(exhibitorIds)));
    }

    private void requireIdentityService(String authorization) {
        String expected = "Bearer " + identityServiceToken;
        if (authorization == null || !authorization.equals(expected)) {
            throw new CustomException(ErrorCode.UNAUTHENTICATED, "내부 서비스 인증에 실패했습니다.");
        }
    }
}