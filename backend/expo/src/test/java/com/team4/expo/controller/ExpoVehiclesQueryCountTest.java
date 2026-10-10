package com.team4.expo.controller;

import com.team4.expo.booth.domain.ApplicationStatus;
import com.team4.expo.booth.domain.Booth;
import com.team4.expo.booth.domain.BoothApplication;
import com.team4.expo.booth.domain.BoothApplicationGroup;
import com.team4.expo.booth.domain.Post;
import com.team4.expo.booth.repository.BoothApplicationGroupRepository;
import com.team4.expo.booth.repository.BoothApplicationRepository;
import com.team4.expo.booth.repository.BoothRepository;
import com.team4.expo.booth.repository.PostRepository;
import com.team4.expo.expo.domain.Expo;
import com.team4.expo.expo.repository.ExpoRepository;
import com.team4.expo.vehicle.domain.Vehicle;
import com.team4.expo.vehicle.domain.VehicleImage;
import com.team4.expo.vehicle.repository.VehicleImageRepository;
import com.team4.expo.vehicle.repository.VehicleRepository;
import com.team4.expo.client.ExhibitorProfile;
import com.team4.expo.client.IdentityClient;
import jakarta.persistence.EntityManagerFactory;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 고객 박람회 차량 전시 목록 조회 시 부스 수만큼 추가 쿼리·Identity 호출이 나가지 않는지(N+1) 확인.
// 측정(10ec9ec 전/후, 부스 20개·차량 40대): SELECT 122 -> 6회, Identity 호출 20 -> 5회(참가업체 5곳).
@SpringBootTest(properties = "spring.jpa.properties.hibernate.generate_statistics=true")
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("고객 차량 전시 목록 - 부스 20개 조회 시 SELECT 횟수")
class ExpoVehiclesQueryCountTest {

    private static final int BOOTHS = 20;
    private static final int VEHICLES_PER_BOOTH = 2;
    private static final int IMAGES_PER_VEHICLE = 2;

    @Autowired MockMvc mockMvc;
    @Autowired EntityManagerFactory emf;
    @Autowired JdbcTemplate jdbc;
    @Autowired ExpoRepository expoRepository;
    @Autowired BoothRepository boothRepository;
    @Autowired BoothApplicationRepository boothApplicationRepository;
    @Autowired BoothApplicationGroupRepository boothApplicationGroupRepository;
    @Autowired PostRepository postRepository;
    @Autowired VehicleRepository vehicleRepository;
    @Autowired VehicleImageRepository vehicleImageRepository;

    @MockBean IdentityClient identityClient;

    Long expoId;

    @BeforeEach
    void setUp() {
        jdbc.execute("SET FOREIGN_KEY_CHECKS = 0");
        List<String> tables = jdbc.queryForList(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() "
                        + "AND table_type = 'BASE TABLE' AND table_name <> 'flyway_schema_history'", String.class);
        tables.forEach(t -> jdbc.execute("TRUNCATE TABLE `" + t + "`"));
        jdbc.execute("SET FOREIGN_KEY_CHECKS = 1");

        when(identityClient.getExhibitorProfile(anyLong()))
                .thenAnswer(inv -> Optional.of(new ExhibitorProfile("업체" + inv.getArgument(0), "자동차", null, null, null)));

        // 박람회 1개에 참가 확정 부스 20개(참가업체 5곳이 4개씩), 부스마다 차량 2대 · 차량당 이미지 2장
        LocalDateTime now = LocalDateTime.now();
        Expo expo = new Expo("엑스포", "COEX", now.minusDays(2), now.plusDays(33), now.minusDays(5), now.plusDays(10));
        expo.open();
        expoId = expoRepository.save(expo).getId();
        for (int i = 0; i < BOOTHS; i++) {
            long exhibitorId = 100L + i % 5;
            Booth booth = boothRepository.save(new Booth(expo, "A-" + i, "조립 부스", 3_000_000));
            BoothApplicationGroup group = boothApplicationGroupRepository.save(new BoothApplicationGroup(
                    expo, exhibitorId, "전기차", "전시", true, false, false, null));
            boothApplicationRepository.save(new BoothApplication(booth, group, exhibitorId, ApplicationStatus.CONFIRMED));
            booth.assign();
            boothRepository.saveAndFlush(booth);
            postRepository.save(new Post(booth, "부스 " + i, "소개"));
            for (int v = 0; v < VEHICLES_PER_BOOTH; v++) {
                Vehicle vehicle = vehicleRepository.save(new Vehicle(booth, "차량" + i + "-" + v, "SUV", 50_000_000L,
                        "요약", "설명", "특징", "흰색", "500km", "77kWh", "200kW"));
                for (int m = 0; m < IMAGES_PER_VEHICLE; m++) {
                    vehicleImageRepository.save(new VehicleImage(vehicle, "https://img/" + i + "-" + v + "-" + m, m));
                }
            }
        }
    }

    @Test
    void 차량_전시_목록_SELECT_횟수() throws Exception {
        Statistics stats = emf.unwrap(SessionFactory.class).getStatistics();
        stats.clear();
        Mockito.clearInvocations(identityClient);

        mockMvc.perform(get("/api/customer/expos/" + expoId + "/vehicles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(BOOTHS))
                .andExpect(jsonPath("$.data[0].vehicles.length()").value(VEHICLES_PER_BOOTH));

        long selects = stats.getPrepareStatementCount();
        int identityCalls = Mockito.mockingDetails(identityClient).getInvocations().size();
        System.out.println("[N+1 측정] 부스 " + BOOTHS + "개 · 차량 " + (BOOTHS * VEHICLES_PER_BOOTH)
                + "대 조회 SELECT = " + selects + ", Identity 호출 = " + identityCalls);
        assertThat(selects).isLessThanOrEqualTo(6);
        assertThat(identityCalls).isEqualTo(5);
    }
}
