package com.team4.expo.repository;

import com.team4.expo.domain.VehicleImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VehicleImageRepository extends JpaRepository<VehicleImage, Long> {

    List<VehicleImage> findByVehicle_IdOrderBySortOrderAsc(Long vehicleId);

    int countByVehicle_Id(Long vehicleId);

    void deleteByVehicle_Id(Long vehicleId);
}
