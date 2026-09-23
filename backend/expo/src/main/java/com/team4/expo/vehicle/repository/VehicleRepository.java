package com.team4.expo.vehicle.repository;

import com.team4.expo.vehicle.domain.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {

    List<Vehicle> findByBooth_IdOrderByCreatedAtAsc(Long boothId);

    List<Vehicle> findByBooth_IdInOrderByCreatedAtAsc(List<Long> boothIds);
}
