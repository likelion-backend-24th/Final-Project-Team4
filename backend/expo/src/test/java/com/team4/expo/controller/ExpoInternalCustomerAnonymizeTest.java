package com.team4.expo.controller;

import com.team4.expo.booth.domain.Booth;
import com.team4.expo.booth.repository.BoothApplicationGroupRepository;
import com.team4.expo.booth.repository.BoothApplicationRepository;
import com.team4.expo.booth.repository.BoothRepository;
import com.team4.expo.consultation.domain.Consultation;
import com.team4.expo.consultation.repository.ConsultationRepository;
import com.team4.expo.expo.domain.Expo;
import com.team4.expo.expo.repository.ExpoRepository;
import com.team4.expo.lead.domain.Lead;
import com.team4.expo.lead.repository.LeadRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Identity -> Expo 회원 탈퇴 시 상담 신청, 리드 개인정보 익명화 내부 API
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ExpoInternalCustomerAnonymizeTest {

    private static final long CUSTOMER_ID = 9401L;
    private static final long OTHER_CUSTOMER_ID = 9402L;
    private static final String SVC_TOKEN = "Bearer local_dev_identity_token";

    @Autowired MockMvc mockMvc;
    @Autowired ExpoRepository expoRepository;
    @Autowired BoothRepository boothRepository;
    @Autowired BoothApplicationRepository boothApplicationRepository;
    @Autowired BoothApplicationGroupRepository boothApplicationGroupRepository;
    @Autowired ConsultationRepository consultationRepository;
    @Autowired LeadRepository leadRepository;

    private Booth booth;

    @BeforeEach
    void setUp() {
        leadRepository.deleteAllInBatch();
        consultationRepository.deleteAllInBatch();
        boothApplicationRepository.deleteAllInBatch();
        boothApplicationGroupRepository.deleteAllInBatch();
        boothRepository.deleteAllInBatch();
        expoRepository.deleteAllInBatch();

        LocalDateTime now = LocalDateTime.now();
        Expo expo = expoRepository.save(new Expo("2026 모빌리티 엑스포", "COEX",
                now.plusDays(30), now.plusDays(33), now.minusDays(5), now.plusDays(10)));
        booth = boothRepository.save(new Booth(expo, "A-101", "조립 부스", 3_000_000));
    }

    private Consultation consultation(long customerId) {
        return consultationRepository.save(new Consultation(booth, customerId, "홍길동", "010-1234-5678",
                "hong@example.com", true, false, "EV6", true,
                LocalDate.now().plusDays(1), LocalTime.of(14, 0), "상담 부탁드립니다", true));
    }

    @Test
    void 탈퇴한_고객의_상담신청과_리드만_익명화된다() throws Exception {
        Consultation mine = consultation(CUSTOMER_ID);
        Consultation other = consultation(OTHER_CUSTOMER_ID);
        Lead lead = leadRepository.save(new Lead(booth, CUSTOMER_ID, LocalDate.now(), mine,
                "홍길동", "hong@example.com", "EV6 관심", true));

        mockMvc.perform(post("/internal/expo/customers/{customerId}/anonymize", CUSTOMER_ID)
                        .header(HttpHeaders.AUTHORIZATION, SVC_TOKEN))
                .andExpect(status().isOk());

        Consultation anonymized = consultationRepository.findById(mine.getId()).orElseThrow();
        assertThat(anonymized.getCustomerName()).isEqualTo("탈퇴한 회원");
        assertThat(anonymized.getCustomerPhone()).isEmpty();
        assertThat(anonymized.getCustomerEmail()).isEmpty();
        assertThat(anonymized.getMessage()).isNull();

        Lead anonymizedLead = leadRepository.findById(lead.getId()).orElseThrow();
        assertThat(anonymizedLead.getCustomerName()).isEqualTo("탈퇴한 회원");
        assertThat(anonymizedLead.getCustomerEmail()).isNull();
        assertThat(anonymizedLead.getInterestNote()).isNull();

        // 다른 고객 데이터는 그대로
        assertThat(consultationRepository.findById(other.getId()).orElseThrow().getCustomerEmail())
                .isEqualTo("hong@example.com");
    }

    @Test
    void 서비스토큰이_틀리면_401() throws Exception {
        mockMvc.perform(post("/internal/expo/customers/{customerId}/anonymize", CUSTOMER_ID)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer wrong-token"))
                .andExpect(status().isUnauthorized());
    }
}
