package com.team4.identity.user.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.identity.auth.service.RefreshTokenStore;
import com.team4.identity.expo.client.ExhibitorApplicationStats;
import com.team4.identity.expo.client.ExpoClient;
import com.team4.identity.reservation.client.CustomerCheckInStatus;
import com.team4.identity.reservation.client.ReservationClient;
import com.team4.identity.user.domain.Role;
import com.team4.identity.user.domain.User;
import com.team4.identity.user.domain.UserStatus;
import com.team4.identity.user.dto.ExhibitorAdminStatsResponse;
import com.team4.identity.user.dto.UserAdminDetailResponse;
import com.team4.identity.user.dto.UserAdminStatsResponse;
import com.team4.identity.user.dto.UserAdminSummaryResponse;
import com.team4.identity.user.repository.UserRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 관리자 회원 조회(목록/검색/상세) + 정지/정지해제. 역할 변경·강제 탈퇴는 스코프 밖.
@Service
@Transactional(readOnly = true)
public class AdminUserService {

    private final UserRepository userRepository;
    private final RefreshTokenStore refreshTokenStore;
    private final ReservationClient reservationClient;
    private final ExpoClient expoClient;

    public AdminUserService(UserRepository userRepository, RefreshTokenStore refreshTokenStore,
                            ReservationClient reservationClient, ExpoClient expoClient) {
        this.userRepository = userRepository;
        this.refreshTokenStore = refreshTokenStore;
        this.reservationClient = reservationClient;
        this.expoClient = expoClient;
    }

    public Page<UserAdminSummaryResponse> listUsers(String keyword, Role role, UserStatus status,
                                                    LocalDate signupFrom, LocalDate signupTo, Pageable pageable) {
        Page<UserAdminSummaryResponse> page = userRepository
                .search(keyword, role, status, startOfDay(signupFrom), startOfNextDay(signupTo), pageable)
                .map(UserAdminSummaryResponse::from);

        // 체크인/참가 신청 정보는 각 화면(참관객/참가업체)에서만 의미가 있고, 다른 역할 조회 시 불필요한 서비스 간 호출을 피한다.
        if (role == Role.USER) {
            return page.map(enrichWithCheckInStatus(page.getContent()));
        }
        if (role == Role.EXHIBITOR) {
            return page.map(enrichWithExhibitorStats(page.getContent()));
        }
        return page;
    }

    // 회원 관리(참관객/참가업체) 엑셀 다운로드용 - 페이징 없이 조건에 맞는 전체 목록.
    public List<UserAdminSummaryResponse> listAllUsers(String keyword, Role role, UserStatus status,
                                                       LocalDate signupFrom, LocalDate signupTo) {
        List<UserAdminSummaryResponse> all = userRepository
                .searchAll(keyword, role, status, startOfDay(signupFrom), startOfNextDay(signupTo))
                .stream()
                .map(UserAdminSummaryResponse::from)
                .toList();

        if (all.isEmpty()) {
            return all;
        }
        if (role == Role.USER) {
            Function<UserAdminSummaryResponse, UserAdminSummaryResponse> enrich = enrichWithCheckInStatus(all);
            return all.stream().map(enrich).toList();
        }
        if (role == Role.EXHIBITOR) {
            Function<UserAdminSummaryResponse, UserAdminSummaryResponse> enrich = enrichWithExhibitorStats(all);
            return all.stream().map(enrich).toList();
        }
        return all;
    }

    // 회원 관리(참관객) 상단 통계 카드(전체/활성/오늘 가입/탈퇴).
    public UserAdminStatsResponse getUserStats(Role role) {
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime tomorrowStart = todayStart.plusDays(1);

        long total = userRepository.countByRole(role);
        long active = userRepository.countByRoleAndStatus(role, UserStatus.ACTIVE);
        long withdrawn = userRepository.countByRoleAndStatus(role, UserStatus.WITHDRAWN);
        long todaySignup = userRepository.countByRoleAndCreatedAtBetween(role, todayStart, tomorrowStart);

        return new UserAdminStatsResponse(total, active, todaySignup, withdrawn);
    }

    // 회원 관리(참가업체) 상단 통계 카드(전체 업체/활성 업체/참가중 업체/미참가 업체).
    // 참가중/미참가는 활성 업체만 대상으로 Expo에 물어봐서 나눈다(정지·탈퇴 업체는 집계에서 제외).
    public ExhibitorAdminStatsResponse getExhibitorStats() {
        long total = userRepository.countByRole(Role.EXHIBITOR);
        long active = userRepository.countByRoleAndStatus(Role.EXHIBITOR, UserStatus.ACTIVE);

        List<Long> activeExhibitorIds = userRepository.findIdsByRoleAndStatus(Role.EXHIBITOR, UserStatus.ACTIVE);
        long participating = expoClient.getApplicationStats(activeExhibitorIds).stream()
                .filter(ExhibitorApplicationStats::participating)
                .count();

        return new ExhibitorAdminStatsResponse(total, active, participating, active - participating);
    }

    // 목록에 있는 유저 id들만 모아 Reservation에 한 번에 물어보고(N+1 방지), 각 응답에 결과를 붙여 새 함수로 반환.
    // Reservation 호출이 실패해도(ReservationClient가 fail-open이라 빈 목록만 옴) 전원 "미체크인"으로 표시될 뿐,
    // 목록 조회 자체는 그대로 성공한다.
    private Function<UserAdminSummaryResponse, UserAdminSummaryResponse> enrichWithCheckInStatus(
            List<UserAdminSummaryResponse> summaries) {
        List<Long> userIds = summaries.stream().map(UserAdminSummaryResponse::getId).toList();
        Map<Long, CustomerCheckInStatus> statusByUserId = reservationClient.getCheckInStatuses(userIds).stream()
                .collect(Collectors.toMap(CustomerCheckInStatus::customerId, s -> s));

        return summary -> {
            CustomerCheckInStatus status = statusByUserId.get(summary.getId());
            boolean checkedIn = status != null && status.checkedIn();
            LocalDateTime lastCheckedInAt = status != null ? status.lastCheckedInAt() : null;
            return summary.withCheckIn(checkedIn, lastCheckedInAt);
        };
    }

    // 목록에 있는 업체 id들만 모아 Expo에 한 번에 물어보고(N+1 방지), 각 응답에 참가 신청 건수·참가 여부를 붙여 새 함수로 반환.
    // Expo 호출이 실패해도(ExpoClient가 fail-open이라 빈 목록만 옴) 전원 "신청 0건/미참가"로 표시될 뿐,
    // 목록 조회 자체는 그대로 성공한다.
    private Function<UserAdminSummaryResponse, UserAdminSummaryResponse> enrichWithExhibitorStats(
            List<UserAdminSummaryResponse> summaries) {
        List<Long> exhibitorIds = summaries.stream().map(UserAdminSummaryResponse::getId).toList();
        Map<Long, ExhibitorApplicationStats> statsByExhibitorId = expoClient.getApplicationStats(exhibitorIds).stream()
                .collect(Collectors.toMap(ExhibitorApplicationStats::exhibitorId, s -> s));

        return summary -> {
            ExhibitorApplicationStats stats = statsByExhibitorId.get(summary.getId());
            long applicationCount = stats != null ? stats.applicationCount() : 0L;
            boolean participating = stats != null && stats.participating();
            return summary.withExhibitorStats(applicationCount, participating);
        };
    }

    private LocalDateTime startOfDay(LocalDate date) {
        return date == null ? null : date.atStartOfDay();
    }

    private LocalDateTime startOfNextDay(LocalDate date) {
        return date == null ? null : date.plusDays(1).atStartOfDay();
    }

    public UserAdminDetailResponse getUserDetail(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "회원을 찾을 수 없습니다."));
        return UserAdminDetailResponse.from(user);
    }

    // 회원 정지/정지 해제. ACTIVE<->LOCKED 전환만 허용(관리자 계정, 탈퇴한 계정은 대상 아님).
    @Transactional
    public UserAdminDetailResponse updateStatus(Long userId, UserStatus targetStatus) {
        if (targetStatus != UserStatus.ACTIVE && targetStatus != UserStatus.LOCKED) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "정지 또는 정지 해제만 가능합니다.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "회원을 찾을 수 없습니다."));

        if (user.getRole() == Role.ADMIN) {
            throw new CustomException(ErrorCode.FORBIDDEN, "관리자 계정은 상태를 변경할 수 없습니다.");
        }
        if (user.getStatus() == UserStatus.WITHDRAWN) {
            throw new CustomException(ErrorCode.INVALID_STATE, "탈퇴한 회원은 상태를 변경할 수 없습니다.");
        }

        if (targetStatus == UserStatus.LOCKED) {
            user.lock();
            refreshTokenStore.delete(userId); // 정지 즉시 강제 로그아웃
        } else {
            user.activate();
        }

        return UserAdminDetailResponse.from(user);
    }
}