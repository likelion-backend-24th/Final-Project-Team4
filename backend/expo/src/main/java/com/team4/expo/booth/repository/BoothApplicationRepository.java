package com.team4.expo.booth.repository;


import com.team4.expo.booth.domain.ApplicationStatus;
import com.team4.expo.booth.domain.BoothApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BoothApplicationRepository extends JpaRepository<BoothApplication, Long> {

    // "동일 부스 + 동일 업체 + 진행 중인 상태(SUBMITTED/PAYMENT_PENDING/CONFIRMED)"의 신청이 있는지 확인
    boolean existsByBooth_IdAndExhibitorIdAndStatusIn(Long boothId, Long exhibitorId, List<ApplicationStatus> statuses);

    // 부스에 배정 확정된(CONFIRMED) 신청 1건 조회 - 부스 상세에 참가업체 정보를 붙일 때 사용
    Optional<BoothApplication> findByBooth_IdAndStatus(Long boothId, ApplicationStatus status);

    // 그룹에 속한 모든 부스 신청 조회 (제출/취소 시 그룹 단위 처리에 사용)
    List<BoothApplication> findByGroup_Id(String groupId);

    // 박람회 하나에 속한 모든 부스 신청 조회 (Admin 통계·부스 배치도 집계용)
    List<BoothApplication> findByBooth_Expo_Id(Long expoId);

    // 같은 부스에 이미 승인 진행 중(PAYMENT_PENDING)이거나 확정(CONFIRMED)된 다른 신청이 있는지 확인
    // (관리자가 한 부스를 여러 업체에 중복 승인하는 것을 막기 위한 검증)
    boolean existsByBooth_IdAndStatusIn(Long boothId, List<ApplicationStatus> statuses);

    // 참가업체가 참가 확정(CONFIRMED)받은 부스 목록 - 상담 신청 목록 조회 시 담당 부스 범위를 좁히는 데 사용.
    // booth/expo는 id만 쓰는 호출부라 lazy 그대로 둠(getId()는 프록시에서 쿼리 없이 바로 나옴).
    List<BoothApplication> findByExhibitorIdAndStatus(Long exhibitorId, ApplicationStatus status);

    // LeadService.listMyBooths() 전용 - boothNo/expoTitle처럼 id가 아닌 필드까지 읽어야 해서
    // JOIN FETCH로 한 번에 가져옴(N+1 방지, 위 findByExhibitorIdAndStatus와 달리 booth/expo까지 로딩).
    @Query("SELECT ba FROM BoothApplication ba JOIN FETCH ba.booth b JOIN FETCH b.expo "
            + "WHERE ba.exhibitorId = :exhibitorId AND ba.status = :status")
    List<BoothApplication> findWithBoothAndExpoByExhibitorIdAndStatus(
            @Param("exhibitorId") Long exhibitorId, @Param("status") ApplicationStatus status);

    // 관리자 회원(참가업체) 화면 - 여러 업체의 "참가 신청 건수"를 한 번에 집계(DRAFT 제외 - 아직 제출 전이라 신청으로 안 침).
    @Query("SELECT ba.exhibitorId AS exhibitorId, COUNT(ba) AS applicationCount FROM BoothApplication ba "
            + "WHERE ba.exhibitorId IN :exhibitorIds AND ba.status <> com.team4.expo.booth.domain.ApplicationStatus.DRAFT "
            + "GROUP BY ba.exhibitorId")
    List<ExhibitorApplicationCountProjection> countApplicationsByExhibitorIds(@Param("exhibitorIds") List<Long> exhibitorIds);

    // 관리자 회원(참가업체) 화면 - 주어진 업체들 중 참가 확정(CONFIRMED)된 신청이 하나라도 있는 업체 id만 추출("참가중" 판정용).
    @Query("SELECT DISTINCT ba.exhibitorId FROM BoothApplication ba "
            + "WHERE ba.exhibitorId IN :exhibitorIds AND ba.status = com.team4.expo.booth.domain.ApplicationStatus.CONFIRMED")
    List<Long> findExhibitorIdsWithConfirmedApplication(@Param("exhibitorIds") List<Long> exhibitorIds);
}