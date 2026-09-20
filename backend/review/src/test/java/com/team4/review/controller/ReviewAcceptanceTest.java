package com.team4.review.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.team4.review.client.BoothReviewEligibility;
import com.team4.review.client.ExpoClient;
import com.team4.review.client.IdentityClient;
import com.team4.review.repository.ReviewImageRepository;
import com.team4.review.repository.ReviewRepository;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// STORY 8(#71) / TASK 8-5 Acceptance Test: 후기 작성·조회, 자격 검증, 사진 첨부.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("STORY 8 Acceptance - 후기 작성/조회")
class ReviewAcceptanceTest {

    private static final long CUSTOMER_ID = 9001L;
    private static final long OTHER_CUSTOMER_ID = 9002L;
    private static final long BOOTH_ID = 501L;
    private static final String BOOTH_NO = "A-101";

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired ReviewRepository reviewRepository;
    @Autowired ReviewImageRepository reviewImageRepository;

    @MockBean ExpoClient expoClient;
    @MockBean IdentityClient identityClient;

    private static RequestPostProcessor customer() {
        return customer(CUSTOMER_ID);
    }

    private static RequestPostProcessor customer(long customerId) {
        return request -> {
            request.addHeader("X-User-Id", String.valueOf(customerId));
            request.addHeader("X-User-Role", "USER");
            return request;
        };
    }

    @BeforeEach
    void setUp() {
        reviewImageRepository.deleteAllInBatch();
        reviewRepository.deleteAllInBatch();

        when(identityClient.getCustomerName(anyLong())).thenReturn(Optional.of("홍길동"));
        when(expoClient.checkReviewEligibility(eq(BOOTH_ID), eq(CUSTOMER_ID), anyString()))
                .thenReturn(new BoothReviewEligibility(true, BOOTH_NO));
    }

    private String createBody(String reviewType, String vehicleName, String content) {
        try {
            Map<String, Object> body = new java.util.HashMap<>();
            body.put("reviewType", reviewType);
            body.put("vehicleName", vehicleName);
            body.put("content", content);
            return objectMapper.writeValueAsString(body);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    @DisplayName("자격이 있는 고객은 상담후기를 작성할 수 있고, 목록에 마스킹된 이름으로 노출된다")
    void 정상_상담후기_작성() throws Exception {
        mockMvc.perform(post("/api/customer/booths/{boothId}/reviews", BOOTH_ID).with(customer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody("CONSULT", "EV6", "친절한 상담이었습니다.")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.customerName").value("홍○○"))
                .andExpect(jsonPath("$.data.vehicleName").value("EV6"))
                .andExpect(jsonPath("$.data.boothNo").value(BOOTH_NO));

        mockMvc.perform(get("/api/customer/booths/{boothId}/reviews", BOOTH_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalCount").value(1))
                .andExpect(jsonPath("$.data.consultReviews.length()").value(1))
                .andExpect(jsonPath("$.data.boothReviews.length()").value(0));
    }

    @Test
    @DisplayName("상담후기는 차량명이 없으면 400")
    void 상담후기_차량명_필수() throws Exception {
        mockMvc.perform(post("/api/customer/booths/{boothId}/reviews", BOOTH_ID).with(customer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody("CONSULT", null, "차량명 없이 씁니다.")))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("부스후기는 차량명 없이도 작성할 수 있다")
    void 정상_부스후기_작성() throws Exception {
        mockMvc.perform(post("/api/customer/booths/{boothId}/reviews", BOOTH_ID).with(customer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody("BOOTH", null, "부스가 깔끔했습니다.")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.vehicleName").doesNotExist());
    }

    @Test
    @DisplayName("작성 자격이 없으면(Expo가 eligible=false) 409")
    void 자격없음_409() throws Exception {
        when(expoClient.checkReviewEligibility(eq(BOOTH_ID), eq(CUSTOMER_ID), anyString()))
                .thenReturn(new BoothReviewEligibility(false, BOOTH_NO));

        mockMvc.perform(post("/api/customer/booths/{boothId}/reviews", BOOTH_ID).with(customer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody("BOOTH", null, "아직 상담 완료 전입니다.")))
                .andExpect(status().isConflict());

        assertThat(reviewRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("로그인하지 않으면 후기 작성은 401")
    void 비로그인_작성_401() throws Exception {
        mockMvc.perform(post("/api/customer/booths/{boothId}/reviews", BOOTH_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody("BOOTH", null, "비회원 시도")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("후기 목록은 비회원도 조회할 수 있다")
    void 비회원_목록조회_가능() throws Exception {
        mockMvc.perform(get("/api/customer/booths/{boothId}/reviews", BOOTH_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalCount").value(0));
    }

    private Long createReviewAndGetId() throws Exception {
        String body = mockMvc.perform(post("/api/customer/booths/{boothId}/reviews", BOOTH_ID).with(customer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody("BOOTH", null, "사진 테스트용 후기")))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).path("data").path("reviewId").asLong();
    }

    @Test
    @DisplayName("본인 후기에 사진을 추가하면 목록 조회 시 함께 내려온다")
    void 정상_사진추가() throws Exception {
        Long reviewId = createReviewAndGetId();
        MockMultipartFile image = new MockMultipartFile("image", "photo.png", "image/png", new byte[]{1, 2, 3});

        mockMvc.perform(multipart("/api/customer/booths/{boothId}/reviews/{reviewId}/images", BOOTH_ID, reviewId)
                        .file(image).with(customer()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.imageUrl").exists());

        mockMvc.perform(get("/api/customer/booths/{boothId}/reviews", BOOTH_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.boothReviews[0].images.length()").value(1));
    }

    @Test
    @DisplayName("사진은 최대 5장까지만 등록할 수 있다")
    void 사진_최대5장() throws Exception {
        Long reviewId = createReviewAndGetId();

        for (int i = 0; i < 5; i++) {
            MockMultipartFile image = new MockMultipartFile("image", "photo" + i + ".png", "image/png", new byte[]{1, 2, 3});
            mockMvc.perform(multipart("/api/customer/booths/{boothId}/reviews/{reviewId}/images", BOOTH_ID, reviewId)
                            .file(image).with(customer()))
                    .andExpect(status().isCreated());
        }

        MockMultipartFile sixth = new MockMultipartFile("image", "photo5.png", "image/png", new byte[]{1, 2, 3});
        mockMvc.perform(multipart("/api/customer/booths/{boothId}/reviews/{reviewId}/images", BOOTH_ID, reviewId)
                        .file(sixth).with(customer()))
                .andExpect(status().isBadRequest());

        assertThat(reviewImageRepository.countByReview_Id(reviewId)).isEqualTo(5);
    }

    @Test
    @DisplayName("본인이 작성한 후기가 아니면 사진 추가가 403")
    void 타인후기_사진추가_403() throws Exception {
        Long reviewId = createReviewAndGetId();
        MockMultipartFile image = new MockMultipartFile("image", "photo.png", "image/png", new byte[]{1, 2, 3});

        mockMvc.perform(multipart("/api/customer/booths/{boothId}/reviews/{reviewId}/images", BOOTH_ID, reviewId)
                        .file(image).with(customer(OTHER_CUSTOMER_ID)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("내가 쓴 후기 조회 - 본인 후기만, 부스ID/유형 포함")
    void 내후기_조회() throws Exception {
        createReviewAndGetId();

        mockMvc.perform(get("/api/customer/reviews/mine").with(customer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].boothId").value(BOOTH_ID))
                .andExpect(jsonPath("$.data[0].reviewType").value("BOOTH"));

        mockMvc.perform(get("/api/customer/reviews/mine").with(customer(OTHER_CUSTOMER_ID)))
                .andExpect(jsonPath("$.data.length()").value(0));
    }

    @Test
    @DisplayName("본인 후기는 내용을 수정할 수 있고, 유형 변경은 400, 타인은 403")
    void 후기_수정() throws Exception {
        Long reviewId = createReviewAndGetId();

        mockMvc.perform(put("/api/customer/booths/{boothId}/reviews/{reviewId}", BOOTH_ID, reviewId).with(customer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody("BOOTH", null, "수정한 내용")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content").value("수정한 내용"));

        mockMvc.perform(put("/api/customer/booths/{boothId}/reviews/{reviewId}", BOOTH_ID, reviewId).with(customer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody("CONSULT", "EV6", "유형 변경 시도")))
                .andExpect(status().isBadRequest());

        mockMvc.perform(put("/api/customer/booths/{boothId}/reviews/{reviewId}", BOOTH_ID, reviewId).with(customer(OTHER_CUSTOMER_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody("BOOTH", null, "남의 후기 수정")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("본인 후기는 사진과 함께 삭제할 수 있고, 타인은 403")
    void 후기_삭제() throws Exception {
        Long reviewId = createReviewAndGetId();
        MockMultipartFile image = new MockMultipartFile("image", "photo.png", "image/png", new byte[]{1, 2, 3});
        mockMvc.perform(multipart("/api/customer/booths/{boothId}/reviews/{reviewId}/images", BOOTH_ID, reviewId)
                .file(image).with(customer())).andExpect(status().isCreated());

        mockMvc.perform(delete("/api/customer/booths/{boothId}/reviews/{reviewId}", BOOTH_ID, reviewId).with(customer(OTHER_CUSTOMER_ID)))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/customer/booths/{boothId}/reviews/{reviewId}", BOOTH_ID, reviewId).with(customer()))
                .andExpect(status().isNoContent());

        assertThat(reviewRepository.findAll()).isEmpty();
        assertThat(reviewImageRepository.findAll()).isEmpty();
    }

    private static final long EXHIBITOR_ID = 700L;

    private static RequestPostProcessor exhibitor() {
        return request -> {
            request.addHeader("X-User-Id", String.valueOf(EXHIBITOR_ID));
            request.addHeader("X-User-Role", "EXHIBITOR");
            return request;
        };
    }

    @Test
    @DisplayName("참가업체는 본인 부스 후기를 실명으로 조회할 수 있다 - 2026-09-16 확정")
    void 참가업체_실명조회() throws Exception {
        when(expoClient.isBoothOwnedByExhibitor(BOOTH_ID, EXHIBITOR_ID)).thenReturn(true);
        createReviewAndGetId();

        mockMvc.perform(get("/api/exhibitor/booths/{boothId}/reviews", BOOTH_ID).with(exhibitor()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].customerName").value("홍길동"))
                .andExpect(jsonPath("$.data[0].reviewType").value("BOOTH"));
    }

    @Test
    @DisplayName("본인 부스가 아니면 참가업체 후기 조회는 403")
    void 참가업체_타부스조회_403() throws Exception {
        when(expoClient.isBoothOwnedByExhibitor(BOOTH_ID, EXHIBITOR_ID)).thenReturn(false);

        mockMvc.perform(get("/api/exhibitor/booths/{boothId}/reviews", BOOTH_ID).with(exhibitor()))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("고객(USER) 토큰으로 참가업체 후기 API를 호출하면 403")
    void 고객이_참가업체API_호출_403() throws Exception {
        mockMvc.perform(get("/api/exhibitor/booths/{boothId}/reviews", BOOTH_ID).with(customer()))
                .andExpect(status().isForbidden());
    }
}
