package com.team4.expo.repository;

import com.team4.expo.domain.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {

    List<Vehicle> findByBooth_IdOrderByCreatedAtAsc(Long boothId);
}
