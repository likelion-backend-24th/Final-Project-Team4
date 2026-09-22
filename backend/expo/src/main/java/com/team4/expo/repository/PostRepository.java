package com.team4.expo.repository;

import com.team4.expo.domain.Post;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, Long> {

    Optional<Post> findByBooth_Id(Long boothId);

    List<Post> findByBooth_IdIn(List<Long> boothIds);
}
