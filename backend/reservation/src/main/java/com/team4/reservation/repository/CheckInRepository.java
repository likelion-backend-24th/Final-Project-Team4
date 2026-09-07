package com.team4.reservation.repository;

import com.team4.reservation.domain.CheckIn;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CheckInRepository extends JpaRepository<CheckIn, Long> {
}
