package com.team4.expo.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.team4.expo.vehicle.dto.VehicleSearchCandidate;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

// Google Gemini API로 자연어 차량 검색
@Component
public class GeminiVehicleSearchClient implements VehicleSearchInterpreter {

    private static final Logger log = LoggerFactory.getLogger(GeminiVehicleSearchClient.class);
    private static final int MAX_ATTEMPTS = 2;

    // 응답은 vehicleId 배열 + 한 줄 summary뿐이라 짧다 - 상한 없이 무제한 출력을 막아 토큰 비용을 캡(2026-09-23, 절감 감사).
    private static final int MAX_OUTPUT_TOKENS = 400;

    private final String apiKey;
    private final String model;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public GeminiVehicleSearchClient(@Value("${gemini.api-key}") String apiKey,
                                      @Value("${gemini.model}") String model,
                                      ObjectMapper objectMapper) {
        this.apiKey = apiKey;
        this.model = model;
        this.objectMapper = objectMapper;
    }

    @Override
    public Optional<VehicleSearchInterpretation> search(String query, List<VehicleSearchCandidate> candidates) {
        if (apiKey == null || apiKey.isBlank() || candidates.isEmpty()) {
            return Optional.empty();
        }

        String prompt = buildPrompt(query, candidates);

        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                String requestBody = objectMapper.writeValueAsString(Map.of(
                        "contents", new Object[]{Map.of("parts", new Object[]{Map.of("text", prompt)})},
                        "generationConfig", Map.of("maxOutputTokens", MAX_OUTPUT_TOKENS)));

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent"))
                        .header("Content-Type", "application/json")
                        .header("x-goog-api-key", apiKey)
                        .timeout(Duration.ofSeconds(15))
                        .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() != 200) {
                    boolean retryable = response.statusCode() == 503 || response.statusCode() == 429;
                    log.warn("Gemini 차량 검색 호출 실패 (status={}, attempt={}/{}): {}",
                            response.statusCode(), attempt, MAX_ATTEMPTS, response.body());
                    if (retryable && attempt < MAX_ATTEMPTS) {
                        Thread.sleep(1000);
                        continue;
                    }
                    return Optional.empty();
                }

                JsonNode root = objectMapper.readTree(response.body());
                String text = root.path("candidates").path(0).path("content").path("parts").path(0).path("text").asText(null);
                return parseResult(text);
            } catch (IOException | InterruptedException e) {
                log.warn("Gemini 차량 검색 호출 중 오류: {}", e.getMessage());
                return Optional.empty();
            }
        }
        return Optional.empty();
    }

    // 모델이 ```json 코드블록으로 감싸서 줄 때 걷어내고 파싱
    private Optional<VehicleSearchInterpretation> parseResult(String text) {
        if (text == null || text.isBlank()) {
            return Optional.empty();
        }
        String cleaned = text.trim();
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replaceFirst("^```[a-zA-Z]*\\n?", "").replaceFirst("```\\s*$", "").trim();
        }
        try {
            JsonNode json = objectMapper.readTree(cleaned);
            List<Long> ids = new java.util.ArrayList<>();
            json.path("matchedVehicleIds").forEach(node -> ids.add(node.asLong()));
            String summary = json.path("summary").asText(null);
            return Optional.of(new VehicleSearchInterpretation(ids, summary));
        } catch (IOException e) {
            log.warn("Gemini 차량 검색 응답 파싱 실패: {}", e.getMessage());
            return Optional.empty();
        }
    }

    // 2026-09-15에 description/features/colors를 200자로 잘라 보내는 절단을 적용했었으나, 뒷부분에
    // 검색 판단에 필요한 정보(예: "가족용" 판단 근거가 되는 트렁크 공간 설명)가 있으면 잘려나가 검색 결과가
    // 부정확해질 수 있다는 리스크가 실측 없이 남아있었음. 2026-09-23 - CustomerVehicleService.applyHardFilters로
    // 가격대·차종 조건을 Gemini 호출 전에 미리 걸러 후보 수 자체를 줄이는 방식으로 비용 절감 전략을 바꾸면서
    // 절단은 원복 - 필드는 원문 그대로 보낸다(정보 손실 없음).
    private record PromptCandidate(Long vehicleId, String name, String tags, Long startPrice, String summary,
                                    String description, String features, String colors,
                                    String range, String battery, String power,
                                    String brand, String category, String drivetrain, Integer seatingCapacity) {
        static PromptCandidate from(VehicleSearchCandidate c) {
            return new PromptCandidate(c.getVehicleId(), c.getName(), c.getTags(), c.getStartPrice(), c.getSummary(),
                    c.getDescription(), c.getFeatures(), c.getColors(),
                    c.getRange(), c.getBattery(), c.getPower(),
                    c.getBrand(), c.getCategory(), c.getDrivetrain(), c.getSeatingCapacity());
        }
    }

    private String buildPrompt(String query, List<VehicleSearchCandidate> candidates) {
        String candidatesJson;
        try {
            candidatesJson = objectMapper.writeValueAsString(candidates.stream().map(PromptCandidate::from).toList());
        } catch (IOException e) {
            candidatesJson = "[]";
        }

        return "다음은 모빌리티 박람회에 전시된 차량 목록이다(JSON). 각 항목의 vehicleId, name, tags, startPrice(원), "
                + "summary, description, features, colors, range(주행거리), battery, power, brand(제조사), "
                + "category(차종), drivetrain(구동방식), seatingCapacity(승차인원)를 참고해서, "
                + "사용자 질문에 맞는 차량만 골라줘.\n\n"
                + "규칙:\n"
                + "- 가격 질문(\"300만원대\" 등)은 startPrice(원 단위 숫자)를 보고 직접 판단해.\n"
                + "- \"가족끼리 타기 좋은\", \"연비 좋은\" 처럼 특정 단어가 그대로 없어도, description/features/summary 내용을 보고 "
                + "의미상 맞는지 판단해서 골라.\n"
                + "- 순위는 필요없고, 조건에 맞는 차량의 vehicleId만 배열로 담아줘. 하나도 없으면 빈 배열.\n"
                + "- summary 필드에 질문을 어떻게 이해했는지 한국어 한 문장으로 적어줘 (예: \"가족용 SUV/미니밴을 찾으시는 것으로 이해했어요\").\n"
                + "- 다른 설명 없이 아래 JSON 형식만 출력해: {\"matchedVehicleIds\": [1, 2], \"summary\": \"...\"}\n\n"
                + "차량 목록:\n" + candidatesJson + "\n\n"
                + "사용자 질문: " + query;
    }
}
