package com.team4.expo.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.expo.client.ExhibitorProfile;
import com.team4.expo.client.IdentityClient;
import com.team4.expo.domain.ApplicationStatus;
import com.team4.expo.domain.Booth;
import com.team4.expo.domain.BoothApplication;
import com.team4.expo.domain.BoothStatus;
import com.team4.expo.domain.Expo;
import com.team4.expo.domain.ExpoStatus;
import com.team4.expo.domain.Post;
import com.team4.expo.domain.Vehicle;
import com.team4.expo.dto.CustomerBoothVehiclesResponse;
import com.team4.expo.dto.VehicleResponse;
import com.team4.expo.repository.BoothApplicationRepository;
import com.team4.expo.repository.BoothRepository;
import com.team4.expo.repository.ExpoRepository;
import com.team4.expo.repository.PostRepository;
import com.team4.expo.repository.VehicleImageRepository;
import com.team4.expo.repository.VehicleRepository;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 고객(비회원 포함)이 특정 박람회의 참가 확정 부스별 전시 차량을 둘러볼 때 사용
@Service
@Transactional(readOnly = true)
public class CustomerVehicleService {

    private final ExpoRepository expoRepository;
    private final BoothRepository boothRepository;
    private final PostRepository postRepository;
    private final VehicleRepository vehicleRepository;
    private final VehicleImageRepository vehicleImageRepository;
    private final BoothApplicationRepository boothApplicationRepository;
    private final IdentityClient identityClient;

    public CustomerVehicleService(ExpoRepository expoRepository, BoothRepository boothRepository,
                                   PostRepository postRepository, VehicleRepository vehicleRepository,
                                   VehicleImageRepository vehicleImageRepository,
                                   BoothApplicationRepository boothApplicationRepository,
                                   IdentityClient identityClient) {
        this.expoRepository = expoRepository;
        this.boothRepository = boothRepository;
        this.postRepository = postRepository;
        this.vehicleRepository = vehicleRepository;
        this.vehicleImageRepository = vehicleImageRepository;
        this.boothApplicationRepository = boothApplicationRepository;
        this.identityClient = identityClient;
    }

    public List<CustomerBoothVehiclesResponse> getExpoVehicles(Long expoId) {
        Expo expo = expoRepository.findById(expoId)
                .filter(e -> e.getStatus() == ExpoStatus.OPEN)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "박람회를 찾을 수 없습니다."));

        return boothRepository.findByExpo_IdOrderByBoothNo(expo.getId()).stream()
                .filter(b -> b.getStatus() == BoothStatus.ASSIGNED)
                .map(this::toBoothVehicles)
                .filter(r -> !r.getVehicles().isEmpty())
                .collect(Collectors.toList());
    }

    private CustomerBoothVehiclesResponse toBoothVehicles(Booth booth) {
        Post post = postRepository.findByBooth_Id(booth.getId()).orElse(null);

        List<VehicleResponse> vehicles = vehicleRepository.findByBooth_IdOrderByCreatedAtAsc(booth.getId()).stream()
                .map(this::toVehicleResponse)
                .collect(Collectors.toList());

        return CustomerBoothVehiclesResponse.of(booth, post, companyNameOf(booth), vehicles);
    }

    // post(부스 소개 콘텐츠)를 아직 등록하지 않은 업체를 위한 제목 대체용. 실패해도 null로 넘어가 boothNo 폴백을 쓴다.
    private String companyNameOf(Booth booth) {
        return boothApplicationRepository.findByBooth_IdAndStatus(booth.getId(), ApplicationStatus.CONFIRMED)
                .map(BoothApplication::getExhibitorId)
                .flatMap(identityClient::getExhibitorProfile)
                .map(ExhibitorProfile::companyName)
                .orElse(null);
    }

    private VehicleResponse toVehicleResponse(Vehicle vehicle) {
        return VehicleResponse.from(vehicle, vehicleImageRepository.findByVehicle_IdOrderBySortOrderAsc(vehicle.getId()));
    }
}
