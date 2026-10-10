package com.team4.expo.controller;

import com.team4.expo.booth.domain.ApplicationStatus;
import com.team4.expo.booth.domain.Booth;
import com.team4.expo.booth.domain.BoothApplication;
import com.team4.expo.booth.domain.BoothApplicationGroup;
import com.team4.expo.booth.repository.BoothApplicationGroupRepository;
import com.team4.expo.booth.repository.BoothApplicationRepository;
import com.team4.expo.booth.repository.BoothRepository;
import com.team4.expo.booth.service.BoothApplicationReviewService;
import com.team4.expo.consultation.repository.ConsultationRepository;
import com.team4.expo.expo.domain.Expo;
import com.team4.expo.expo.repository.ExpoRepository;
import com.team4.expo.notification.service.NotificationService;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

// 같은 부스에 들어온 신청 여러 건을 관리자가 동시에 승인해도 1건만 승인(PAYMENT_PENDING)되는지 확인.
@SpringBootTest
@ActiveProfiles("test")
@DisplayName("같은 부스 신청 동시 승인 - 1건만 승인")
class BoothApproveConcurrencyTest {

    private static final int REQUESTS = 10;

    @Autowired BoothApplicationReviewService reviewService;
    @Autowired ExpoRepository expoRepository;
    @Autowired BoothRepository boothRepository;
    @Autowired BoothApplicationRepository boothApplicationRepository;
    @Autowired BoothApplicationGroupRepository boothApplicationGroupRepository;
    @Autowired ConsultationRepository consultationRepository;

    @MockBean NotificationService notificationService;

    private Long boothId;
    private final List<Long> applicationIds = new ArrayList<>();

    @BeforeEach
    void setUp() {
        consultationRepository.deleteAllInBatch();
        boothApplicationRepository.deleteAllInBatch();
        boothApplicationGroupRepository.deleteAllInBatch();
        boothRepository.deleteAllInBatch();
        expoRepository.deleteAllInBatch();

        LocalDateTime now = LocalDateTime.now();
        Expo expo = new Expo("엑스포", "COEX", now.plusDays(10), now.plusDays(13), now.minusDays(5), now.plusDays(5));
        expo.open();
        expoRepository.save(expo);
        Booth booth = boothRepository.save(new Booth(expo, "A-101", "조립 부스", 3_000_000));
        boothId = booth.getId();
        for (int i = 0; i < REQUESTS; i++) {
            long exhibitorId = 100L + i;
            BoothApplicationGroup group = boothApplicationGroupRepository.save(new BoothApplicationGroup(
                    expo, exhibitorId, "전기차", "전시", true, false, false, null));
            applicationIds.add(boothApplicationRepository.save(
                    new BoothApplication(booth, group, exhibitorId, ApplicationStatus.SUBMITTED)).getId());
        }
    }

    @Test
    void 동시_승인_10건() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(REQUESTS);
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger success = new AtomicInteger();
        AtomicInteger rejected = new AtomicInteger();
        for (Long id : applicationIds) {
            pool.submit(() -> {
                try {
                    start.await();
                    reviewService.approveBoothApplication(id);
                    success.incrementAndGet();
                } catch (Exception e) {
                    rejected.incrementAndGet();
                }
            });
        }
        start.countDown();
        pool.shutdown();
        assertThat(pool.awaitTermination(30, TimeUnit.SECONDS)).isTrue();

        long approved = boothApplicationRepository.findAll().stream()
                .filter(a -> a.getStatus() == ApplicationStatus.PAYMENT_PENDING).count();
        System.out.println("[동시 승인 측정] 요청 " + REQUESTS + "건 → 성공 " + success.get()
                + " / 거절 " + rejected.get() + " / PAYMENT_PENDING " + approved);
        assertThat(approved).isEqualTo(1);
    }
}
