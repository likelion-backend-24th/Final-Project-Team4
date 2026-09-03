package com.team4.expo.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.expo.domain.ApplicationStatus;
import com.team4.expo.domain.Booth;
import com.team4.expo.domain.BoothApplication;
import com.team4.expo.domain.BoothApplicationGroup;
import com.team4.expo.domain.BoothStatus;
import com.team4.expo.dto.BoothApplicationGroupConfirmResponse;
import com.team4.expo.dto.BoothApplicationGroupPaymentContextResponse;
import com.team4.expo.dto.BoothApplicationGroupReleaseResponse;
import com.team4.expo.repository.BoothApplicationGroupRepository;
import com.team4.expo.repository.BoothApplicationRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// Payment -> Expo 내부 API 로직 (TASK 2-5). Gateway·OpenAPI에 미노출, ExpoInternalController에서만 호출.
@Service
@Transactional
public class BoothApplicationPaymentService {

    private final BoothApplicationGroupRepository boothApplicationGroupRepository;
    private final BoothApplicationRepository boothApplicationRepository;

    public BoothApplicationPaymentService(BoothApplicationGroupRepository boothApplicationGroupRepository,
                                           BoothApplicationRepository boothApplicationRepository) {
        this.boothApplicationGroupRepository = boothApplicationGroupRepository;
        this.boothApplicationRepository = boothApplicationRepository;
    }

    // 결제 시작 전 그룹의 심사 완료 여부·결제 대상·금액 확인.
    @Transactional(readOnly = true)
    public BoothApplicationGroupPaymentContextResponse getBoothApplicationGroupPaymentContext(String groupId) {
        BoothApplicationGroup group = boothApplicationGroupRepository.findById(groupId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "신청 그룹을 찾을 수 없습니다."));
        List<BoothApplication> applications = boothApplicationRepository.findByGroup_Id(groupId);

        return BoothApplicationGroupPaymentContextResponse.of(group, applications);
    }

    // 결제 완료 확인 후 그룹 내 승인된 부스들을 부스별 독립적으로 확정.
    // 결제 완료 순(선착순)이 아니라 이미 관리자 승인 시점에 부스가 RESERVED로 잠겨있으므로,
    // 여기서는 그 잠금을 최종 확정(ASSIGNED)으로 바꾸기만 하면 된다. paymentId/paidAt은 현재
    // 감사 로그성 정보로만 받음(별도 저장 안 함, Payment 쪽 결제 원장이 원본).
    public BoothApplicationGroupConfirmResponse confirmBoothApplicationGroup(String groupId, String paymentId, LocalDateTime paidAt) {
        BoothApplicationGroup group = boothApplicationGroupRepository.findById(groupId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "신청 그룹을 찾을 수 없습니다."));
        List<BoothApplication> applications = boothApplicationRepository.findByGroup_Id(groupId);

        List<BoothApplication> targets = applications.stream()
                .filter(a -> a.getStatus() == ApplicationStatus.PAYMENT_PENDING || a.getStatus() == ApplicationStatus.CONFIRMED)
                .collect(Collectors.toList());
        if (targets.isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_STATE, "확정할 승인된 신청이 없습니다.");
        }

        List<BoothApplicationGroupConfirmResponse.Result> results = new ArrayList<>();
        for (BoothApplication application : targets) {
            if (application.getStatus() == ApplicationStatus.CONFIRMED) {
                // 같은 paymentId로 재요청된 경우(멱등) - 이미 확정된 건 그대로 반환, 재처리 안 함
                results.add(new BoothApplicationGroupConfirmResponse.Result(
                        application.getId(), application.getBooth().getId(), application.getStatus()));
                continue;
            }

            Booth booth = application.getBooth();
            if (booth.getStatus() == BoothStatus.RESERVED) {
                booth.assign();
                application.confirm();
            } else {
                // 방어 로직: 정상 흐름이면 승인 시점에 RESERVED로 잠겨 있어야 함. 그렇지 않다면 데이터 불일치이므로
                // 확정 대신 환불 대상으로 표시.
                application.requireRefund();
            }
            results.add(new BoothApplicationGroupConfirmResponse.Result(
                    application.getId(), booth.getId(), application.getStatus()));
        }

        return new BoothApplicationGroupConfirmResponse(groupId, results);
    }

    // 결제 실패/시간 초과 시 호출. 승인(PAYMENT_PENDING)됐던 부스를 다시 풀어줘서
    // (RESERVED -> AVAILABLE) 다른 업체가 재신청할 수 있게 하고, 신청은 REJECTED로 되돌린다.
    // 이미 CONFIRMED/REJECTED 등 최종 상태인 건은 건드리지 않음(멱등, 결제 완료와 실패 통보가 겹쳐 와도 안전).
    public BoothApplicationGroupReleaseResponse releaseBoothApplicationGroup(String groupId, String reason) {
        BoothApplicationGroup group = boothApplicationGroupRepository.findById(groupId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "신청 그룹을 찾을 수 없습니다."));
        List<BoothApplication> applications = boothApplicationRepository.findByGroup_Id(groupId);

        String releaseReason = (reason == null || reason.isBlank()) ? "결제 기한 초과로 자동 반려되었습니다." : reason;

        List<BoothApplicationGroupReleaseResponse.Result> results = new ArrayList<>();
        for (BoothApplication application : applications) {
            if (application.getStatus() != ApplicationStatus.PAYMENT_PENDING) {
                continue; // DRAFT/SUBMITTED/REJECTED/CONFIRMED 등은 결제 실패 통보 대상이 아니므로 건드리지 않음
            }

            Booth booth = application.getBooth();
            if (booth.getStatus() == BoothStatus.RESERVED) {
                booth.release();
            }
            application.reject(releaseReason);

            results.add(new BoothApplicationGroupReleaseResponse.Result(
                    application.getId(), booth.getId(), application.getStatus()));
        }

        return new BoothApplicationGroupReleaseResponse(groupId, results);
    }
}
