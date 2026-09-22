package com.team4.expo.service;

import com.team4.expo.dto.ExhibitorApplicationStatsResponse;
import com.team4.expo.repository.BoothApplicationRepository;
import com.team4.expo.repository.ExhibitorApplicationCountProjection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// Identity 관리자 회원(참가업체) 화면 전용 읽기 전용 서비스. 신청 생성/승인 등 쓰기 로직(BoothApplicationService)과는 분리.
@Service
@Transactional(readOnly = true)
public class ExhibitorStatsService {

    private final BoothApplicationRepository boothApplicationRepository;

    public ExhibitorStatsService(BoothApplicationRepository boothApplicationRepository) {
        this.boothApplicationRepository = boothApplicationRepository;
    }

    public List<ExhibitorApplicationStatsResponse> getApplicationStats(List<Long> exhibitorIds) {
        if (exhibitorIds == null || exhibitorIds.isEmpty()) {
            return List.of();
        }

        Map<Long, Long> countByExhibitorId = boothApplicationRepository.countApplicationsByExhibitorIds(exhibitorIds)
                .stream()
                .collect(Collectors.toMap(
                        ExhibitorApplicationCountProjection::getExhibitorId,
                        ExhibitorApplicationCountProjection::getApplicationCount));

        Set<Long> participatingIds = new HashSet<>(
                boothApplicationRepository.findExhibitorIdsWithConfirmedApplication(exhibitorIds));

        return exhibitorIds.stream()
                .distinct()
                .map(exhibitorId -> new ExhibitorApplicationStatsResponse(
                        exhibitorId,
                        countByExhibitorId.getOrDefault(exhibitorId, 0L),
                        participatingIds.contains(exhibitorId)))
                .toList();
    }
}