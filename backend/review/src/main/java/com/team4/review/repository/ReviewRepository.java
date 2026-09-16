package com.team4.review.repository;

import com.team4.review.domain.Review;
import com.team4.review.domain.ReviewType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByBoothIdAndReviewTypeOrderByCreatedAtDesc(Long boothId, ReviewType reviewType);

    long countByBoothId(Long boothId);
}
