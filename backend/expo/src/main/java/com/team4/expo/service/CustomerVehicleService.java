package com.team4.expo.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.expo.client.ExhibitorProfile;
import com.team4.expo.client.IdentityClient;
import com.team4.expo.client.VehicleSearchInterpretation;
import com.team4.expo.client.VehicleSearchInterpreter;
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
import com.team4.expo.dto.VehicleSearchCandidate;
import com.team4.expo.dto.VehicleSearchResponse;
import com.team4.expo.dto.VehicleSearchResultItem;
import com.team4.expo.repository.BoothApplicationRepository;
import com.team4.expo.repository.BoothRepository;
import com.team4.expo.repository.ExpoRepository;
import com.team4.expo.repository.PostRepository;
import com.team4.expo.repository.VehicleImageRepository;
import com.team4.expo.repository.VehicleRepository;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
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
    private final VehicleSearchInterpreter vehicleSearchInterpreter;

    public CustomerVehicleService(ExpoRepository expoRepository, BoothRepository boothRepository,
                                   PostRepository postRepository, VehicleRepository vehicleRepository,
                                   VehicleImageRepository vehicleImageRepository,
                                   BoothApplicationRepository boothApplicationRepository,
                                   IdentityClient identityClient,
                                   VehicleSearchInterpreter vehicleSearchInterpreter) {
        this.expoRepository = expoRepository;
        this.boothRepository = boothRepository;
        this.postRepository = postRepository;
        this.vehicleRepository = vehicleRepository;
        this.vehicleImageRepository = vehicleImageRepository;
        this.boothApplicationRepository = boothApplicationRepository;
        this.identityClient = identityClient;
        this.vehicleSearchInterpreter = vehicleSearchInterpreter;
    }

    public List<CustomerBoothVehiclesResponse> getExpoVehicles(Long expoId) {
        Expo expo = expoRepository.findById(expoId)
                .filter(e -> e.getStatus() == ExpoStatus.OPEN)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "박람회를 찾을 수 없습니다."));

        List<CustomerBoothVehiclesResponse> all = boothRepository.findByExpo_IdOrderByBoothNo(expo.getId()).stream()
                .filter(b -> b.getStatus() == BoothStatus.ASSIGNED)
                .map(this::toBoothVehicles)
                .collect(Collectors.toList());

        // 부스 단위로 "전시 차량 없으면 제외"하면, 같은 회사가 부스를 여러 개 가졌을 때 차량을 아직 등록
        // 안 한 부스만 통째로 빠져서 프론트가 회사 단위로 부스를 묶어도(참가업체 카드/상담 신청 대상) 그
        // 부스가 나타나지 않는다. 같은 회사 부스 중 하나라도 전시 차량이 있으면 나머지도 함께 내려준다.
        Set<String> companiesWithVehicles = all.stream()
                .filter(r -> !r.getVehicles().isEmpty() && r.getCompanyName() != null)
                .map(CustomerBoothVehiclesResponse::getCompanyName)
                .collect(Collectors.toSet());

        return all.stream()
                .filter(r -> !r.getVehicles().isEmpty()
                        || (r.getCompanyName() != null && companiesWithVehicles.contains(r.getCompanyName())))
                .collect(Collectors.toList());
    }

    private CustomerBoothVehiclesResponse toBoothVehicles(Booth booth) {
        Post post = postRepository.findByBooth_Id(booth.getId()).orElse(null);

        List<VehicleResponse> vehicles = vehicleRepository.findByBooth_IdOrderByCreatedAtAsc(booth.getId()).stream()
                .map(this::toVehicleResponse)
                .collect(Collectors.toList());

        return CustomerBoothVehiclesResponse.of(booth, post, companyNameOf(booth), applicationGroupIdOf(booth), vehicles);
    }

    // post(부스 소개 콘텐츠)를 아직 등록하지 않은 업체를 위한 제목 대체용. 실패해도 null로 넘어가 boothNo 폴백을 쓴다.
    private String companyNameOf(Booth booth) {
        return boothApplicationRepository.findByBooth_IdAndStatus(booth.getId(), ApplicationStatus.CONFIRMED)
                .map(BoothApplication::getExhibitorId)
                .flatMap(identityClient::getExhibitorProfile)
                .map(ExhibitorProfile::companyName)
                .orElse(null);
    }

    // 같은 신청(BoothApplicationGroup)으로 함께 접수한 부스끼리만 화면에서 묶어서 보여주기 위한 값.
    private String applicationGroupIdOf(Booth booth) {
        return boothApplicationRepository.findByBooth_IdAndStatus(booth.getId(), ApplicationStatus.CONFIRMED)
                .map(BoothApplication::getGroup)
                .filter(java.util.Objects::nonNull)
                .map(group -> String.valueOf(group.getId()))
                .orElse(null);
    }

    private VehicleResponse toVehicleResponse(Vehicle vehicle) {
        return VehicleResponse.from(vehicle, vehicleImageRepository.findByVehicle_IdOrderBySortOrderAsc(vehicle.getId()));
    }

    // 자연어 차량 검색 - 현재 OPEN인 박람회 전체의 참가 확정 부스 차량을 대상으로 검색
    public VehicleSearchResponse searchVehicles(String query) {
        if (query == null || query.isBlank()) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "검색어를 입력해주세요.");
        }

        List<CandidateEntry> entries = new ArrayList<>();
        for (Expo expo : expoRepository.findByStatus(ExpoStatus.OPEN)) {
            for (Booth booth : boothRepository.findByExpo_IdOrderByBoothNo(expo.getId())) {
                if (booth.getStatus() != BoothStatus.ASSIGNED) {
                    continue;
                }
                List<Vehicle> vehicles = vehicleRepository.findByBooth_IdOrderByCreatedAtAsc(booth.getId());
                if (vehicles.isEmpty()) {
                    continue;
                }
                String companyName = companyNameOf(booth);
                for (Vehicle vehicle : vehicles) {
                    entries.add(new CandidateEntry(expo, booth, companyName, vehicle));
                }
            }
        }

        if (entries.isEmpty()) {
            return new VehicleSearchResponse(List.of(), null);
        }

        List<VehicleSearchCandidate> candidates = entries.stream()
                .map(e -> toCandidate(e.vehicle()))
                .toList();
        Optional<VehicleSearchInterpretation> interpretation = vehicleSearchInterpreter.search(query, candidates);

        List<CandidateEntry> matched;
        String summary;
        if (interpretation.isPresent()) {
            Set<Long> matchedIds = new HashSet<>(interpretation.get().getMatchedVehicleIds());
            matched = entries.stream().filter(e -> matchedIds.contains(e.vehicle().getId())).toList();
            summary = interpretation.get().getSummary();
        } else {
            matched = entries.stream().filter(e -> containsQuery(e.vehicle(), query)).toList();
            summary = null;
        }

        List<VehicleSearchResultItem> results = matched.stream()
                .map(e -> new VehicleSearchResultItem(
                        e.expo().getId(), e.expo().getTitle(),
                        e.booth().getId(), e.booth().getBoothNo(),
                        e.companyName(), toVehicleResponse(e.vehicle())))
                .toList();

        return new VehicleSearchResponse(results, summary);
    }

    // 차량 후보로 변환
    private VehicleSearchCandidate toCandidate(Vehicle v) {
        return new VehicleSearchCandidate(v.getId(), v.getName(), v.getTags(), v.getStartPrice(),
                v.getSummary(), v.getDescription(), v.getFeatures(), v.getColors(),
                v.getRange(), v.getBattery(), v.getPower(),
                v.getBrand(), v.getCategory(), v.getDrivetrain(), v.getSeatingCapacity());
    }

    // AI 미설정/호출 실패 시 폴백 - 원문을 차량의 텍스트 필드 전체에 대해 단순 포함검색
    private boolean containsQuery(Vehicle v, String query) {
        String needle = query.toLowerCase();
        return List.of(v.getName(), v.getTags(), v.getColors(), v.getSummary(), v.getDescription(),
                        v.getFeatures(), v.getRange(), v.getBattery(), v.getPower())
                .stream()
                .filter(s -> s != null && !s.isBlank())
                .anyMatch(s -> s.toLowerCase().contains(needle));
    }

    private record CandidateEntry(Expo expo, Booth booth, String companyName, Vehicle vehicle) {
    }
}
