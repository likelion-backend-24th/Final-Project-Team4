package com.team4.review.repository;

import com.team4.review.domain.Review;
import com.team4.review.domain.ReviewType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByBoothIdAndReviewTypeOrderByCreatedAtDesc(Long boothId, ReviewType reviewType);

    long countByBoothId(Long boothId);

    // 참가업체 대시보드 - 본인 부스로 들어온 후기(상담후기+부스후기) 전체 목록, 실명 조회용.
    List<Review> findByBoothIdOrderByCreatedAtDesc(Long boothId);
}
