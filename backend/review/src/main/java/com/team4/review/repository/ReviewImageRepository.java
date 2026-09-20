package com.team4.review.repository;

import com.team4.review.domain.ReviewImage;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReviewImageRepository extends JpaRepository<ReviewImage, Long> {

    List<ReviewImage> findByReview_IdOrderBySortOrderAsc(Long reviewId);

    // reviewId 목록에 속한 이미지를 한 번에 조회 - 후기 목록 화면에서 후기 개수만큼 쿼리가 나가는 걸 막는다(N+1 방지).
    List<ReviewImage> findByReview_IdInOrderByReview_IdAscSortOrderAsc(List<Long> reviewIds);

    int countByReview_Id(Long reviewId);

    void deleteByReview_Id(Long reviewId);
}
