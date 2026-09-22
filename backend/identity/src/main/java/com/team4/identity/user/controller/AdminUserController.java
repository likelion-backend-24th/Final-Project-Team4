package com.team4.identity.user.controller;

import com.team4.common.response.ApiResponse;
import com.team4.common.response.PageMeta;
import com.team4.identity.user.domain.Role;
import com.team4.identity.user.domain.UserStatus;
import com.team4.identity.user.dto.ExhibitorAdminStatsResponse;
import com.team4.identity.user.dto.UserAdminDetailResponse;
import com.team4.identity.user.dto.UserAdminStatsResponse;
import com.team4.identity.user.dto.UserAdminSummaryResponse;
import com.team4.identity.user.dto.UserStatusUpdateRequest;
import com.team4.identity.user.service.AdminUserService;
import jakarta.validation.Valid;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.core.io.InputStreamResource;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// 관리자 전용 회원 조회 API. 신원은 Gateway가 심은 X-User-Role 헤더 기반 hasRole("ADMIN")으로 검증(SecurityConfig).
@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final AdminUserService adminUserService;

    public AdminUserController(AdminUserService adminUserService) {
        this.adminUserService = adminUserService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageMeta<UserAdminSummaryResponse>>> listUsers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Role role,
            @RequestParam(required = false) UserStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate signupFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate signupTo,
            @PageableDefault(size = 20) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(
                PageMeta.from(adminUserService.listUsers(keyword, role, status, signupFrom, signupTo, pageable))));
    }

    // 참관객 화면 상단 통계 카드(전체/활성/오늘 가입/탈퇴) - role은 필수(현재는 USER 전용. 참가업체는 카드 구성이 달라 아래 별도 엔드포인트 사용).
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<UserAdminStatsResponse>> getUserStats(@RequestParam Role role) {
        return ResponseEntity.ok(ApiResponse.success(adminUserService.getUserStats(role)));
    }

    // 참가업체 화면 전용 상단 통계 카드(전체 업체/활성 업체/참가중 업체/미참가 업체).
    // "/{userId}"보다 먼저 선언 - Spring이 리터럴 경로를 더 구체적으로 보고 우선 매칭하지만 명시적으로 위에 둔다.
    @GetMapping("/exhibitors/stats")
    public ResponseEntity<ApiResponse<ExhibitorAdminStatsResponse>> getExhibitorStats() {
        return ResponseEntity.ok(ApiResponse.success(adminUserService.getExhibitorStats()));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<UserAdminDetailResponse>> getUserDetail(@PathVariable Long userId) {
        return ResponseEntity.ok(ApiResponse.success(adminUserService.getUserDetail(userId)));
    }

    @PatchMapping("/{userId}/status")
    public ResponseEntity<ApiResponse<UserAdminDetailResponse>> updateStatus(
            @PathVariable Long userId,
            @Valid @RequestBody UserStatusUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(adminUserService.updateStatus(userId, request.getStatus())));
    }

    // 회원 목록 엑셀(CSV) 다운로드. 필터 조건은 목록 조회와 동일하게 받되 페이징은 없음(조건에 맞는 전체).
    // 엑셀 전용 라이브러리 없이 CSV로 내려주되, 셀 앞에 BOM을 붙여 엑셀에서 한글이 깨지지 않게 한다.
    @GetMapping("/export")
    public ResponseEntity<InputStreamResource> exportUsers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Role role,
            @RequestParam(required = false) UserStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate signupFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate signupTo) {

        List<UserAdminSummaryResponse> users = adminUserService.listAllUsers(keyword, role, status, signupFrom, signupTo);
        byte[] csv = toCsv(users, role);

        String filename = (role == Role.EXHIBITOR ? "exhibitors_" : role == Role.USER ? "attendees_" : "users_")
                + LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE) + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(filename, StandardCharsets.UTF_8).build().toString())
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(new InputStreamResource(new ByteArrayInputStream(csv)));
    }

    // 역할별 컬럼 구성 - 참관객(USER)/참가업체(EXHIBITOR)는 전용 컬럼, 그 외(ADMIN 등)는 공용 컬럼으로 대체.
    private byte[] toCsv(List<UserAdminSummaryResponse> users, Role role) {
        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("yyyy.MM.dd");
        DateTimeFormatter dateTimeFmt = DateTimeFormatter.ofPattern("yyyy.MM.dd HH:mm");

        StringBuilder sb = new StringBuilder();
        sb.append('\uFEFF'); // UTF-8 BOM - 엑셀이 한글을 깨뜨리지 않고 읽게 하려는 목적

        if (role == Role.USER) {
            sb.append("이름,이메일,연락처,체크인 여부,최종 입장일,상태,가입일\n");
            for (UserAdminSummaryResponse u : users) {
                String checkedIn = Boolean.TRUE.equals(u.getCheckedIn()) ? "체크인" : "미체크인";
                String lastCheckedInAt = fmt(u.getLastCheckedInAt(), dateTimeFmt, "-");
                sb.append(csvField(u.getName())).append(',')
                        .append(csvField(u.getEmail())).append(',')
                        .append(csvField(u.getContact())).append(',')
                        .append(csvField(checkedIn)).append(',')
                        .append(csvField(lastCheckedInAt)).append(',')
                        .append(csvField(statusLabel(u.getStatus()))).append(',')
                        .append(csvField(fmt(u.getCreatedAt(), dateFmt, ""))).append('\n');
            }
        } else if (role == Role.EXHIBITOR) {
            sb.append("회사명,사업자번호,담당자명,연락처,참가 신청 건수,상태,가입일\n");
            for (UserAdminSummaryResponse u : users) {
                long applicationCount = u.getApplicationCount() != null ? u.getApplicationCount() : 0L;
                String participating = Boolean.TRUE.equals(u.getParticipating()) ? "참가중" : "미참가";
                sb.append(csvField(u.getCompanyName())).append(',')
                        .append(csvField(u.getBusinessNo())).append(',')
                        .append(csvField(u.getManagerName())).append(',')
                        .append(csvField(u.getContact())).append(',')
                        .append(applicationCount).append(',')
                        .append(csvField(participating)).append(',')
                        .append(csvField(fmt(u.getCreatedAt(), dateFmt, ""))).append('\n');
            }
        } else {
            sb.append("이름/회사명,이메일,연락처,상태,가입일\n");
            for (UserAdminSummaryResponse u : users) {
                String nameOrCompany = u.getCompanyName() != null ? u.getCompanyName() : u.getName();
                sb.append(csvField(nameOrCompany)).append(',')
                        .append(csvField(u.getEmail())).append(',')
                        .append(csvField(u.getContact())).append(',')
                        .append(csvField(statusLabel(u.getStatus()))).append(',')
                        .append(csvField(fmt(u.getCreatedAt(), dateFmt, ""))).append('\n');
            }
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private String statusLabel(UserStatus status) {
        return switch (status) {
            case ACTIVE -> "활성";
            case LOCKED -> "정지";
            case WITHDRAWN -> "탈퇴";
        };
    }

    private String fmt(LocalDateTime dateTime, DateTimeFormatter formatter, String fallback) {
        return dateTime != null ? dateTime.format(formatter) : fallback;
    }

    // 쉼표/줄바꿈/따옴표가 섞인 값이 CSV 구조를 깨지 않도록 최소 이스케이프.
    private String csvField(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}