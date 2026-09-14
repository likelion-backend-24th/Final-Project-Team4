package com.team4.expo.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.expo.client.VehicleAiAnalysisClient;
import com.team4.expo.client.VehicleImageInput;
import com.team4.expo.domain.ApplicationStatus;
import com.team4.expo.domain.Booth;
import com.team4.expo.domain.Vehicle;
import com.team4.expo.domain.VehicleImage;
import com.team4.expo.dto.VehicleAiAnalysisResponse;
import com.team4.expo.dto.VehicleImageResponse;
import com.team4.expo.dto.VehicleRequest;
import com.team4.expo.dto.VehicleResponse;
import com.team4.expo.repository.BoothApplicationRepository;
import com.team4.expo.repository.BoothRepository;
import com.team4.expo.repository.VehicleImageRepository;
import com.team4.expo.repository.VehicleRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional
public class VehicleService {

    private static final List<ApplicationStatus> CONFIRMED_STATUS_ONLY = List.of(ApplicationStatus.CONFIRMED);
    private static final Set<String> ALLOWED_VEHICLE_IMAGE_TYPES =
            Set.of("image/png", "image/jpeg", "image/webp");
    // 프론트 업로드 안내 문구("최대 10MB")와 반드시 맞춰야 한다 - 여기가 더 작으면
    // 안내받은 대로 올린 사용자의 이미지가 이유 없이 거부되어 "AI가 못 찾는다"처럼 보인다.
    private static final long MAX_VEHICLE_IMAGE_SIZE = 10 * 1024 * 1024;
    private static final int MAX_ANALYSIS_IMAGES = 3;
    private static final int MAX_IMAGES_PER_VEHICLE = 5;
    private static final Path VEHICLE_IMAGE_UPLOAD_DIR = Paths.get("uploads", "vehicle");

    private final BoothRepository boothRepository;
    private final BoothApplicationRepository boothApplicationRepository;
    private final VehicleRepository vehicleRepository;
    private final VehicleImageRepository vehicleImageRepository;
    private final VehicleAiAnalysisClient vehicleAiAnalysisClient;

    public VehicleService(BoothRepository boothRepository,
                           BoothApplicationRepository boothApplicationRepository,
                           VehicleRepository vehicleRepository,
                           VehicleImageRepository vehicleImageRepository,
                           VehicleAiAnalysisClient vehicleAiAnalysisClient) {
        this.boothRepository = boothRepository;
        this.boothApplicationRepository = boothApplicationRepository;
        this.vehicleRepository = vehicleRepository;
        this.vehicleImageRepository = vehicleImageRepository;
        this.vehicleAiAnalysisClient = vehicleAiAnalysisClient;
    }

    @Transactional(readOnly = true)
    public List<VehicleResponse> listVehicles(Long exhibitorId, Long boothId) {
        boothRepository.findById(boothId).orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND));
        validateBoothOwnershipConfirmed(boothId, exhibitorId);

        return vehicleRepository.findByBooth_IdOrderByCreatedAtAsc(boothId).stream()
                .map(vehicle -> VehicleResponse.from(vehicle, findImages(vehicle.getId())))
                .collect(Collectors.toList());
    }

    public VehicleResponse registerVehicle(Long exhibitorId, Long boothId, VehicleRequest request) {
        Booth booth = boothRepository.findById(boothId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND));
        validateBoothOwnershipConfirmed(boothId, exhibitorId);

        Vehicle vehicle = new Vehicle(
                booth,
                request.getName(),
                joinTags(request.getTags()),
                request.getStartPrice(),
                request.getSummary(),
                request.getDescription(),
                request.getFeatures(),
                request.getColors(),
                request.getRange(),
                request.getBattery(),
                request.getPower(),
                request.getBrand(),
                request.getCategory(),
                request.getDrivetrain(),
                request.getChargingType(),
                request.getChargingTime(),
                request.getDimensions(),
                request.getWeight(),
                request.getSeatingCapacity()
        );
        vehicleRepository.save(vehicle);

        return VehicleResponse.from(vehicle, List.of());
    }

    public VehicleResponse updateVehicle(Long exhibitorId, Long boothId, Long vehicleId, VehicleRequest request) {
        validateBoothOwnershipConfirmed(boothId, exhibitorId);
        Vehicle vehicle = findVehicleInBooth(boothId, vehicleId);

        vehicle.update(
                request.getName(),
                joinTags(request.getTags()),
                request.getStartPrice(),
                request.getSummary(),
                request.getDescription(),
                request.getFeatures(),
                request.getColors(),
                request.getRange(),
                request.getBattery(),
                request.getPower(),
                request.getBrand(),
                request.getCategory(),
                request.getDrivetrain(),
                request.getChargingType(),
                request.getChargingTime(),
                request.getDimensions(),
                request.getWeight(),
                request.getSeatingCapacity()
        );

        return VehicleResponse.from(vehicle, findImages(vehicle.getId()));
    }

    public void deleteVehicle(Long exhibitorId, Long boothId, Long vehicleId) {
        validateBoothOwnershipConfirmed(boothId, exhibitorId);
        Vehicle vehicle = findVehicleInBooth(boothId, vehicleId);
        vehicleImageRepository.deleteByVehicle_Id(vehicle.getId());
        vehicleRepository.delete(vehicle);
    }

    public VehicleImageResponse addVehicleImage(Long exhibitorId, Long boothId, Long vehicleId, MultipartFile image) {
        validateBoothOwnershipConfirmed(boothId, exhibitorId);
        Vehicle vehicle = findVehicleInBooth(boothId, vehicleId);
        validateVehicleImage(image);

        int existingCount = vehicleImageRepository.countByVehicle_Id(vehicle.getId());
        if (existingCount >= MAX_IMAGES_PER_VEHICLE) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR,
                    "차량 이미지는 최대 " + MAX_IMAGES_PER_VEHICLE + "장까지 등록할 수 있습니다.");
        }

        String imageUrl = storeVehicleImage(image);
        VehicleImage vehicleImage = new VehicleImage(vehicle, imageUrl, existingCount);
        vehicleImageRepository.save(vehicleImage);

        return VehicleImageResponse.from(vehicleImage);
    }

    public void deleteVehicleImage(Long exhibitorId, Long boothId, Long vehicleId, Long imageId) {
        validateBoothOwnershipConfirmed(boothId, exhibitorId);
        findVehicleInBooth(boothId, vehicleId);

        VehicleImage image = vehicleImageRepository.findById(imageId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND));
        if (!image.getVehicle().getId().equals(vehicleId)) {
            throw new CustomException(ErrorCode.NOT_FOUND);
        }
        vehicleImageRepository.delete(image);
    }

    // 차량 사진 1~여러 장(정면/측면/후면 등)을 AI로 함께 분석해 스펙 초안을 돌려준다.
    // 등록/수정 화면 마법사 중간 단계에서 호출되며 DB에는 아무것도 저장하지 않는다 -
    // 사용자가 결과를 확인/수정한 뒤 등록·수정 API로 최종 저장한다. 사용자가 사진을 바꿔서
    // 다시 호출하면(재분석) 그때마다 새로 분석해서 돌려준다 - 이 메서드 자체는 상태를 갖지 않는다.
    @Transactional(readOnly = true)
    public VehicleAiAnalysisResponse analyzeVehicleImage(Long exhibitorId, Long boothId, List<MultipartFile> images) {
        validateBoothOwnershipConfirmed(boothId, exhibitorId);

        List<MultipartFile> nonEmpty = images == null
                ? List.of()
                : images.stream().filter(f -> f != null && !f.isEmpty()).collect(Collectors.toList());

        if (nonEmpty.isEmpty()) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR,
                    "정면, 측면, 후면 중 최소 1장의 이미지가 필요합니다.");
        }
        if (nonEmpty.size() > MAX_ANALYSIS_IMAGES) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR,
                    "이미지는 한 번에 최대 " + MAX_ANALYSIS_IMAGES + "장까지 분석할 수 있습니다.");
        }
        nonEmpty.forEach(this::validateVehicleImage);

        List<VehicleImageInput> inputs = nonEmpty.stream()
                .map(file -> {
                    try {
                        return new VehicleImageInput(file.getBytes(), file.getContentType());
                    } catch (IOException e) {
                        throw new CustomException(ErrorCode.INTERNAL_ERROR, "이미지 처리에 실패했습니다.");
                    }
                })
                .collect(Collectors.toList());

        return vehicleAiAnalysisClient.analyzeVehicleImages(inputs)
                .orElseGet(VehicleAiAnalysisResponse::notAnalyzed);
    }

    private List<VehicleImage> findImages(Long vehicleId) {
        return vehicleImageRepository.findByVehicle_IdOrderBySortOrderAsc(vehicleId);
    }

    private Vehicle findVehicleInBooth(Long boothId, Long vehicleId) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND));

        if (!vehicle.getBooth().getId().equals(boothId)) {
            throw new CustomException(ErrorCode.NOT_FOUND);
        }
        return vehicle;
    }

    private void validateBoothOwnershipConfirmed(Long boothId, Long exhibitorId) {
        boolean confirmed = boothApplicationRepository.existsByBooth_IdAndExhibitorIdAndStatusIn(
                boothId, exhibitorId, CONFIRMED_STATUS_ONLY);

        if (!confirmed) {
            throw new CustomException(ErrorCode.FORBIDDEN, "참가 확정된 담당 부스만 관리할 수 있습니다.");
        }
    }

    private void validateVehicleImage(MultipartFile image) {
        if (image == null || image.isEmpty()) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "이미지 파일이 필요합니다.");
        }
        if (!ALLOWED_VEHICLE_IMAGE_TYPES.contains(image.getContentType())) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "PNG, JPEG, WEBP 형식의 이미지만 업로드할 수 있습니다.");
        }
        if (image.getSize() > MAX_VEHICLE_IMAGE_SIZE) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "이미지 파일은 5MB를 초과할 수 없습니다.");
        }
    }

    private String storeVehicleImage(MultipartFile image) {
        try {
            Files.createDirectories(VEHICLE_IMAGE_UPLOAD_DIR);

            String extension = StringUtils.getFilenameExtension(image.getOriginalFilename());
            String fileName = UUID.randomUUID() + "." + extension;
            Path target = VEHICLE_IMAGE_UPLOAD_DIR.resolve(fileName);
            image.transferTo(target);

            return "/uploads/vehicle/" + fileName;
        } catch (IOException e) {
            throw new CustomException(ErrorCode.INTERNAL_ERROR, "이미지 저장에 실패했습니다.");
        }
    }

    private String joinTags(List<String> tags) {
        if (tags == null || tags.isEmpty()) {
            return null;
        }
        return String.join(",", tags);
    }
}
