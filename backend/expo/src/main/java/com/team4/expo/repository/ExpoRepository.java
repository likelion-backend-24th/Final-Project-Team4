package com.team4.expo.repository;

import com.team4.expo.domain.Expo;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExpoRepository extends JpaRepository<Expo, Long> {
}