package com.team4.expo.repository;

import com.team4.expo.domain.Review;
import com.team4.expo.domain.ReviewType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByBooth_IdAndReviewTypeOrderByCreatedAtDesc(Long boothId, ReviewType reviewType);

    long countByBooth_Id(Long boothId);
}
