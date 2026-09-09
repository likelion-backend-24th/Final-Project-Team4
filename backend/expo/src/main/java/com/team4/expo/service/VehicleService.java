package com.team4.expo.service;

import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.expo.domain.ApplicationStatus;
import com.team4.expo.domain.Booth;
import com.team4.expo.domain.Vehicle;
import com.team4.expo.domain.VehicleImage;
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
    private static final long MAX_VEHICLE_IMAGE_SIZE = 5 * 1024 * 1024;
    private static final int MAX_IMAGES_PER_VEHICLE = 5;
    private static final Path VEHICLE_IMAGE_UPLOAD_DIR = Paths.get("uploads", "vehicle");

    private final BoothRepository boothRepository;
    private final BoothApplicationRepository boothApplicationRepository;
    private final VehicleRepository vehicleRepository;
    private final VehicleImageRepository vehicleImageRepository;

    public VehicleService(BoothRepository boothRepository,
                           BoothApplicationRepository boothApplicationRepository,
                           VehicleRepository vehicleRepository,
                           VehicleImageRepository vehicleImageRepository) {
        this.boothRepository = boothRepository;
        this.boothApplicationRepository = boothApplicationRepository;
        this.vehicleRepository = vehicleRepository;
        this.vehicleImageRepository = vehicleImageRepository;
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
                request.getPower()
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
                request.getPower()
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
