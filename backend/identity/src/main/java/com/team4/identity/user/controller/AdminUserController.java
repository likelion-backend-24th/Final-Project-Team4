package com.team4.identity.user.controller;

import com.team4.common.response.ApiResponse;
import com.team4.common.response.PageMeta;
import com.team4.identity.user.domain.Role;
import com.team4.identity.user.domain.UserStatus;
import com.team4.identity.user.dto.UserAdminDetailResponse;
import com.team4.identity.user.dto.UserAdminSummaryResponse;
import com.team4.identity.user.dto.UserStatusUpdateRequest;
import com.team4.identity.user.service.AdminUserService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
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
            @PageableDefault(size = 20) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(
                PageMeta.from(adminUserService.listUsers(keyword, role, status, pageable))));
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
}
