package com.team4.expo.repository;

import com.team4.expo.domain.BoothStatus;
import com.team4.expo.domain.Post;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, Long> {

    Optional<Post> findByBooth_Id(Long boothId);

    // 특정 박람회에서 부스 상태가 지정 값인 부스의 소개글 (공개 조회용)
    List<Post> findByBooth_Expo_IdAndBooth_Status(Long expoId, BoothStatus status);
}
