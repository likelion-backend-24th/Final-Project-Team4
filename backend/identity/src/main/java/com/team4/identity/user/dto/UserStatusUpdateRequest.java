package com.team4.identity.user.dto;

import com.team4.identity.user.domain.UserStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

// 관리자 회원 상태 변경 요청 - ACTIVE(정지 해제)/LOCKED(정지)만 허용, WITHDRAWN은 이 API로 강제할 수 없음
@Getter
public class UserStatusUpdateRequest {

    @NotNull
    private UserStatus status;
}
