package com.team4.expo.controller;

import com.team4.expo.booth.domain.ApplicationStatus;
import com.team4.expo.booth.domain.Booth;
import com.team4.expo.booth.domain.BoothApplication;
import com.team4.expo.booth.domain.BoothApplicationGroup;
import com.team4.expo.booth.repository.BoothApplicationGroupRepository;
import com.team4.expo.booth.repository.BoothApplicationRepository;
import com.team4.expo.booth.repository.BoothRepository;
import com.team4.expo.client.ExhibitorProfile;
import com.team4.expo.client.IdentityClient;
import com.team4.expo.consultation.domain.Consultation;
import com.team4.expo.consultation.repository.ConsultationRepository;
import com.team4.expo.expo.domain.Expo;
import com.team4.expo.expo.repository.ExpoRepository;
import jakarta.persistence.EntityManagerFactory;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Optional;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 고객 내 상담 목록 조회 시 상담 건수만큼 추가 쿼리가 나가지 않는지(N+1) SELECT 횟수로 확인.
@SpringBootTest(properties = "spring.jpa.properties.hibernate.generate_statistics=true")
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("고객 내 상담 목록 - 상담 20건 조회 시 SELECT 횟수")
class MyConsultationsQueryCountTest {

    private static final long CUSTOMER_ID = 9001L;
    private static final int COUNT = 20;

    @Autowired MockMvc mockMvc;
    @Autowired EntityManagerFactory emf;
    @Autowired ExpoRepository expoRepository;
    @Autowired BoothRepository boothRepository;
    @Autowired BoothApplicationRepository boothApplicationRepository;
    @Autowired BoothApplicationGroupRepository boothApplicationGroupRepository;
    @Autowired ConsultationRepository consultationRepository;

    @MockBean IdentityClient identityClient;

    @BeforeEach
    void setUp() {
        consultationRepository.deleteAllInBatch();
        boothApplicationRepository.deleteAllInBatch();
        boothApplicationGroupRepository.deleteAllInBatch();
        boothRepository.deleteAllInBatch();
        expoRepository.deleteAllInBatch();
        when(identityClient.getExhibitorProfile(anyLong()))
                .thenAnswer(inv -> Optional.of(new ExhibitorProfile("업체" + inv.getArgument(0), "자동차", null, null, null)));

        // 상담 20건이 각각 다른 박람회·부스·참가업체에 걸려 있는 상황
        LocalDateTime now = LocalDateTime.now();
        for (int i = 0; i < COUNT; i++) {
            Expo expo = new Expo("엑스포 " + i, "COEX",
                    now.minusDays(2), now.plusDays(33), now.minusDays(5), now.plusDays(10));
            expo.open();
            expoRepository.save(expo);
            long exhibitorId = 100L + i;
            Booth booth = boothRepository.save(new Booth(expo, "A-" + i, "조립 부스", 3_000_000));
            BoothApplicationGroup group = boothApplicationGroupRepository.save(new BoothApplicationGroup(
                    expo, exhibitorId, "전기차", "전시", true, false, false, null));
            boothApplicationRepository.save(new BoothApplication(booth, group, exhibitorId, ApplicationStatus.CONFIRMED));
            booth.assign();
            boothRepository.saveAndFlush(booth);
            consultationRepository.save(new Consultation(booth, CUSTOMER_ID, "홍길동", "010-1234-5678",
                    "hong@example.com", true, false, "EV6", true,
                    LocalDate.now().plusDays(1), LocalTime.of(14, 0), "상담 부탁드립니다", false));
        }
    }

    @Test
    void 내_상담_목록_SELECT_횟수() throws Exception {
        Statistics stats = emf.unwrap(SessionFactory.class).getStatistics();
        stats.clear();

        mockMvc.perform(get("/api/customer/consultations")
                        .header("X-User-Id", String.valueOf(CUSTOMER_ID))
                        .header("X-User-Role", "USER"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(COUNT))
                .andExpect(jsonPath("$.data[0].companyName").isNotEmpty());

        long selects = stats.getPrepareStatementCount();
        System.out.println("[N+1 측정] 상담 " + COUNT + "건 조회 SELECT = " + selects);
        assertThat(selects).isLessThanOrEqualTo(2);
    }
}
