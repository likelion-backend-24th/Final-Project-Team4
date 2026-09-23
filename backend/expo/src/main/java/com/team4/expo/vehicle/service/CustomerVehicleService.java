package com.team4.expo.vehicle.service;


import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import com.team4.expo.client.ExhibitorProfile;
import com.team4.expo.client.IdentityClient;
import com.team4.expo.client.VehicleSearchInterpretation;
import com.team4.expo.client.VehicleSearchInterpreter;
import com.team4.expo.booth.domain.ApplicationStatus;
import com.team4.expo.booth.domain.Booth;
import com.team4.expo.booth.domain.BoothApplication;
import com.team4.expo.booth.domain.BoothStatus;
import com.team4.expo.expo.domain.Expo;
import com.team4.expo.expo.domain.ExpoStatus;
import com.team4.expo.booth.domain.Post;
import com.team4.expo.vehicle.domain.Vehicle;
import com.team4.expo.vehicle.domain.VehicleImage;
import com.team4.expo.vehicle.dto.CustomerBoothVehiclesResponse;
import com.team4.expo.vehicle.dto.VehicleResponse;
import com.team4.expo.vehicle.dto.VehicleSearchCandidate;
import com.team4.expo.vehicle.dto.VehicleSearchResponse;
import com.team4.expo.vehicle.dto.VehicleSearchResultItem;
import com.team4.expo.booth.repository.BoothApplicationRepository;
import com.team4.expo.booth.repository.BoothRepository;
import com.team4.expo.expo.repository.ExpoRepository;
import com.team4.expo.booth.repository.PostRepository;
import com.team4.expo.vehicle.repository.VehicleImageRepository;
import com.team4.expo.vehicle.repository.VehicleRepository;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
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

    // 원래 부스 하나당 post/vehicle/신청건/참가업체명 조회가 각각 따로 나가던 N+1 쿼리였음(트러블슈팅: docs/troubleshooting.md
    // "참가업체 목록 조회 N+1" 참고) - 박람회 하나 안의 데이터는 부스 개수와 무관하게 고정된 쿼리 몇 번으로 한 번에 불러온다.
    public List<CustomerBoothVehiclesResponse> getExpoVehicles(Long expoId) {
        Expo expo = expoRepository.findById(expoId)
                .filter(e -> e.getStatus() == ExpoStatus.OPEN)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND, "박람회를 찾을 수 없습니다."));

        List<Booth> booths = boothRepository.findByExpo_IdOrderByBoothNo(expo.getId()).stream()
                .filter(b -> b.getStatus() == BoothStatus.ASSIGNED)
                .toList();
        List<Long> boothIds = booths.stream().map(Booth::getId).toList();

        Map<Long, BoothApplication> confirmedByBoothId = boothApplicationRepository.findByBooth_Expo_Id(expoId).stream()
                .filter(a -> a.getStatus() == ApplicationStatus.CONFIRMED)
                .collect(Collectors.toMap(a -> a.getBooth().getId(), a -> a, (a, b) -> a));

        Map<Long, Post> postByBoothId = postRepository.findByBooth_IdIn(boothIds).stream()
                .collect(Collectors.toMap(p -> p.getBooth().getId(), p -> p, (a, b) -> a));

        List<Vehicle> vehicles = vehicleRepository.findByBooth_IdInOrderByCreatedAtAsc(boothIds);
        Map<Long, List<VehicleImage>> imagesByVehicleId = vehicleImageRepository
                .findByVehicle_IdInOrderBySortOrderAsc(vehicles.stream().map(Vehicle::getId).toList()).stream()
                .collect(Collectors.groupingBy(img -> img.getVehicle().getId()));
        Map<Long, List<VehicleResponse>> vehiclesByBoothId = vehicles.stream()
                .collect(Collectors.groupingBy(v -> v.getBooth().getId(), Collectors.mapping(
                        v -> VehicleResponse.from(v, imagesByVehicleId.getOrDefault(v.getId(), List.of())),
                        Collectors.toList())));

        // 같은 참가업체가 부스를 여러 개 가지면 exhibitorId가 겹치므로 Identity 조회도 exhibitorId당 한 번만.
        Map<Long, String> companyNameByExhibitorId = new HashMap<>();

        List<CustomerBoothVehiclesResponse> all = booths.stream()
                .map(booth -> {
                    BoothApplication application = confirmedByBoothId.get(booth.getId());
                    String companyName = application == null ? null
                            : companyNameByExhibitorId.computeIfAbsent(application.getExhibitorId(),
                                    id -> identityClient.getExhibitorProfile(id).map(ExhibitorProfile::companyName).orElse(null));
                    String applicationGroupId = application != null && application.getGroup() != null
                            ? String.valueOf(application.getGroup().getId()) : null;
                    return CustomerBoothVehiclesResponse.of(booth, postByBoothId.get(booth.getId()), companyName,
                            applicationGroupId, vehiclesByBoothId.getOrDefault(booth.getId(), List.of()));
                })
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

        // 가격대·차종처럼 규칙으로 판단 가능한 조건은 Gemini에 넘기기 전에 먼저 걸러서 후보 수 자체를 줄인다
        // (2026-09-23, 토큰 비용 절감 - 텍스트 필드를 자르는 대신 후보 수를 줄이는 방식으로 전환).
        // "가족용"처럼 규칙으로 못 거르는 의미론적 질의는 조건이 하나도 안 잡혀서 원래대로 전체 후보가 그대로 감.
        List<CandidateEntry> filtered = applyHardFilters(query, entries);

        List<VehicleSearchCandidate> candidates = filtered.stream()
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

    // 가격 질문("300만원대", "5000만원 이하" 등)과 차종("SUV" 등)은 규칙으로 판단 가능해서 Gemini 호출 전에
    // 미리 거른다. 둘 다 못 찾으면(= 순수 의미론적 질의) 아무것도 안 거르고 전체 후보를 그대로 넘긴다 -
    // 규칙이 못 잡는 질의를 섣불리 좁혔다가 정답 차량을 후보에서 아예 빼버리는 걸 방지.
    // 금액 표기: "5000만원", "7천만원", "1억", "1억원" - 단위(만/천만/억)까지 같이 잡는다.
    private static final String AMOUNT = "(\\d+)\\s*(억|천만|만)\\s*원?";
    private static final Pattern PRICE_RANGE = Pattern.compile("(\\d+)\\s*~\\s*(\\d+)\\s*만원");
    private static final Pattern PRICE_MAX = Pattern.compile(AMOUNT + "\\s*(이하|이내)");
    private static final Pattern PRICE_MIN = Pattern.compile(AMOUNT + "\\s*이상");
    private static final Pattern PRICE_BAND = Pattern.compile(AMOUNT + "\\s*대");
    private static final List<String> KNOWN_CATEGORIES = List.of(
            "세단", "SUV", "스포츠카", "해치백", "미니밴", "트럭", "쿠페", "컨버터블", "이륜차", "전기 이륜차");

    private static long toWon(String number, String unit) {
        long multiplier = switch (unit) {
            case "억" -> 100_000_000L;
            case "천만" -> 10_000_000L;
            default -> 10_000L;
        };
        return Long.parseLong(number) * multiplier;
    }

    // "OOO대"의 범위 폭은 숫자 끝자리 0 개수로 정한다 - "5000만원대"=5000만~5999만, "300만원대"=300만~399만,
    // "7500만원대"=7500만~7599만, "7천만원대"=7천만~7999만, "1억대"=1억~1억9999만.
    private static long bandWidth(String number, String unit) {
        long width = toWon("1", unit);
        for (int i = number.length() - 1; i > 0 && number.charAt(i) == '0'; i--) {
            width *= 10;
        }
        return width;
    }

    private List<CandidateEntry> applyHardFilters(String query, List<CandidateEntry> entries) {
        Long priceMin = null;
        Long priceMax = null;

        Matcher range = PRICE_RANGE.matcher(query);
        Matcher max = PRICE_MAX.matcher(query);
        Matcher min = PRICE_MIN.matcher(query);
        Matcher band = PRICE_BAND.matcher(query);
        if (range.find()) {
            priceMin = Long.parseLong(range.group(1)) * 10_000;
            priceMax = Long.parseLong(range.group(2)) * 10_000;
        } else if (max.find()) {
            priceMax = toWon(max.group(1), max.group(2));
        } else if (min.find()) {
            priceMin = toWon(min.group(1), min.group(2));
        } else if (band.find()) {
            priceMin = toWon(band.group(1), band.group(2));
            priceMax = priceMin + bandWidth(band.group(1), band.group(2)) - 1;
        }

        // 차종은 참가업체가 자유 입력하는 필드라("SUV차량", "suv" 등) 대소문자 무시 + 포함 여부로 매칭.
        String lowerQuery = query.toLowerCase();
        String category = KNOWN_CATEGORIES.stream()
                .filter(c -> lowerQuery.contains(c.toLowerCase()))
                .findFirst()
                .orElse(null);

        if (priceMin == null && priceMax == null && category == null) {
            return entries;
        }

        Long finalPriceMin = priceMin;
        Long finalPriceMax = priceMax;
        String finalCategory = category;
        List<CandidateEntry> result = entries.stream()
                .filter(e -> finalPriceMin == null || e.vehicle().getStartPrice() == null
                        || e.vehicle().getStartPrice() >= finalPriceMin)
                .filter(e -> finalPriceMax == null || e.vehicle().getStartPrice() == null
                        || e.vehicle().getStartPrice() <= finalPriceMax)
                // 차종 미입력(선택 항목) 차량은 제외하지 않고 Gemini 판단에 맡긴다 - 가격 미입력 처리와 같은 기준.
                .filter(e -> finalCategory == null || e.vehicle().getCategory() == null
                        || e.vehicle().getCategory().toLowerCase().contains(finalCategory.toLowerCase()))
                .toList();

        // 조건은 잡았는데 걸리는 차량이 하나도 없으면(예: 실제 없는 가격대) 전체를 보내서 Gemini가
        // "그 조건엔 없다"는 답을 제대로 내게 한다 - 빈 후보로 보내면 무조건 "없음"으로만 답해버림.
        return result.isEmpty() ? entries : result;
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
