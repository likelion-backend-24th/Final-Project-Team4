package com.team4.review.repository;

import com.team4.review.domain.Review;
import com.team4.review.domain.ReviewType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByBoothIdAndReviewTypeOrderByCreatedAtDesc(Long boothId, ReviewType reviewType);

    long countByBoothId(Long boothId);

    // 중복 작성 방지 - 상담후기는 상담 1건당 1개, 부스후기는 고객·부스당 1개.
    boolean existsByConsultationId(Long consultationId);

    boolean existsByCustomerIdAndBoothIdAndReviewType(Long customerId, Long boothId, ReviewType reviewType);

    // 참가업체 대시보드 - 본인 부스로 들어온 후기(상담후기+부스후기) 전체 목록, 실명 조회용.
    List<Review> findByBoothIdOrderByCreatedAtDesc(Long boothId);

    // 마이페이지 - 내가 작성한 후기 목록.
    List<Review> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
}
