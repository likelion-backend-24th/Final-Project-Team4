package com.team4.identity.expo.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.List;

// expo 프로파일이 아닐 때(로컬 개발/테스트 기본값) 사용되는 스텁 - 항상 "신청 0건/미참가"로 처리.
@Component
@Profile("!expo")
@Slf4j
public class StubExpoClient implements ExpoClient {

    @Override
    public List<ExhibitorApplicationStats> getApplicationStats(List<Long> exhibitorIds) {
        log.info("[STUB] Expo 참가 신청 통계 연동 미구현 - 전원 신청 0건/미참가로 처리 exhibitorIds={}", exhibitorIds);
        return List.of();
    }
}