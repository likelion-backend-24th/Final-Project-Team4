package com.team4.expo.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.team4.expo.vehicle.dto.VehicleAiAnalysisResponse;
import java.awt.Image;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import javax.imageio.ImageIO;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

// Google Gemini Vision API로 차량 사진(정면/측면/후면 등 1~여러 장)을 한 번에 분석해 스펙 초안을 추출.
// 여러 각도의 사진을 함께 보내면 한 장만 볼 때보다 인식 정확도가 올라간다.
// 부가 기능(fail-open) - 키 미설정/호출 실패/응답 파싱 실패 시 조용히 Optional.empty()로 폴백하고,
// 사용자는 마법사 폼에 직접 입력하면 된다. (상담 요약용 GeminiSummaryClient와 동일한 구조)
@Component
public class GeminiVehicleAnalysisClient implements VehicleAiAnalysisClient {

    private static final Logger log = LoggerFactory.getLogger(GeminiVehicleAnalysisClient.class);
    private static final int MAX_ATTEMPTS = 2;

    // 스펙 JSON 응답이라 짧다 - 상한 없이 무제한 출력을 막아 토큰 비용을 캡(2026-09-23, 절감 감사).
    private static final int MAX_OUTPUT_TOKENS = 700;

    // 2026-09-23 실측(gemini-3.5-flash-lite, 4032x3024 원본 vs 1024x768 축소본 동일 프롬프트 비교):
    // promptTokenCount가 1172로 완전히 동일(IMAGE 모달리티 1064 토큰 그대로) - 이 모델은 입력 해상도와 무관하게
    // 이미지를 고정 토큰수로 정규화해서 처리하므로, 리사이즈는 토큰 비용 절감 효과가 없다(가설이 틀렸음, 실측으로 확인).
    // 그래도 업로드 페이로드 크기(279KB→32KB)와 base64 인코딩·네트워크 전송 비용은 줄어들어 유지한다.
    private static final int MAX_IMAGE_DIMENSION = 1024;

    private final String apiKey;
    private final String model;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public GeminiVehicleAnalysisClient(@Value("${gemini.api-key}") String apiKey,
                                       @Value("${gemini.model}") String model,
                                       ObjectMapper objectMapper) {
        this.apiKey = apiKey;
        this.model = model;
        this.objectMapper = objectMapper;
    }

    @Override
    public Optional<VehicleAiAnalysisResponse> analyzeVehicleImages(List<VehicleImageInput> images) {
        if (apiKey == null || apiKey.isBlank() || images == null || images.isEmpty()) {
            log.warn("Gemini 차량 이미지 분석 스킵 - apiKey 설정 여부={}, 이미지 개수={}",
                    apiKey != null && !apiKey.isBlank(), images == null ? 0 : images.size());
            return Optional.empty();
        }

        String requestBody = buildRequestBody(images);

        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent"))
                        .header("Content-Type", "application/json")
                        .header("x-goog-api-key", apiKey)
                        .timeout(Duration.ofSeconds(30))
                        .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() != 200) {
                    boolean retryable = response.statusCode() == 503 || response.statusCode() == 429;
                    // 이 로그가 실제 실패 원인이다 (모델명 오류 404, API 키 오류 401/403, 요청 형식 오류 400 등).
                    // "이미지를 넣었는데 계속 못 찾는다"는 증상은 대부분 여기서 잡힌다 - 콘솔에서 이 줄을 확인할 것.
                    log.warn("Gemini 차량 이미지 분석 호출 실패 (status={}, attempt={}/{}, model={}): {}",
                            response.statusCode(), attempt, MAX_ATTEMPTS, model, response.body());
                    if (retryable && attempt < MAX_ATTEMPTS) {
                        Thread.sleep(1000);
                        continue;
                    }
                    return Optional.empty();
                }

                JsonNode root = objectMapper.readTree(response.body());
                String text = root.path("candidates").path(0).path("content").path("parts").path(0).path("text").asText(null);
                if (text == null || text.isBlank()) {
                    log.warn("Gemini 차량 이미지 분석 응답에 text 파트가 없음: {}", response.body());
                    return Optional.empty();
                }

                return parseAnalysis(text);
            } catch (IOException | InterruptedException e) {
                log.warn("Gemini 차량 이미지 분석 중 오류: {}", e.getMessage(), e);
                return Optional.empty();
            }
        }
        return Optional.empty();
    }

    private Optional<VehicleAiAnalysisResponse> parseAnalysis(String text) {
        try {
            JsonNode json = objectMapper.readTree(stripCodeFence(text));

            List<String> tags = new ArrayList<>();
            if (json.has("tags") && json.get("tags").isArray()) {
                json.get("tags").forEach(t -> {
                    if (t.isTextual() && !t.asText().isBlank()) {
                        tags.add(t.asText().trim());
                    }
                });
            }

            Integer seatingCapacity = null;
            JsonNode seatingNode = json.get("seatingCapacity");
            if (seatingNode != null && seatingNode.isNumber()) {
                seatingCapacity = seatingNode.asInt();
            }

            return Optional.of(new VehicleAiAnalysisResponse(
                    true,
                    textOrNull(json, "name"),
                    textOrNull(json, "brand"),
                    textOrNull(json, "category"),
                    tags,
                    textOrNull(json, "summary"),
                    textOrNull(json, "description"),
                    textOrNull(json, "features"),
                    textOrNull(json, "colors"),
                    textOrNull(json, "range"),
                    textOrNull(json, "battery"),
                    textOrNull(json, "power"),
                    textOrNull(json, "drivetrain"),
                    textOrNull(json, "chargingType"),
                    textOrNull(json, "chargingTime"),
                    textOrNull(json, "dimensions"),
                    textOrNull(json, "weight"),
                    seatingCapacity
            ));
        } catch (IOException e) {
            log.warn("Gemini 차량 이미지 분석 응답 파싱 실패: {}, 원본 텍스트: {}", e.getMessage(), text);
            return Optional.empty();
        }
    }

    private String textOrNull(JsonNode json, String field) {
        JsonNode node = json.get(field);
        if (node == null || node.isNull() || !node.isTextual()) {
            return null;
        }
        String value = node.asText().trim();
        return value.isBlank() ? null : value;
    }

    // 모델이 ```json ... ``` 코드펜스로 감싸서 응답하는 경우 대비
    private String stripCodeFence(String text) {
        String trimmed = text.trim();
        if (trimmed.startsWith("```")) {
            int firstNewline = trimmed.indexOf('\n');
            int lastFence = trimmed.lastIndexOf("```");
            if (firstNewline != -1 && lastFence > firstNewline) {
                trimmed = trimmed.substring(firstNewline + 1, lastFence).trim();
            }
        }
        return trimmed;
    }

    private String buildRequestBody(List<VehicleImageInput> images) {
        try {
            List<Object> parts = new ArrayList<>();
            parts.add(Map.of("text", buildPrompt(images.size())));
            for (VehicleImageInput image : images) {
                byte[] resized = resizeIfNeeded(image.bytes());
                Map<String, Object> inlineData = Map.of(
                        "mimeType", "image/jpeg",
                        "data", Base64.getEncoder().encodeToString(resized)
                );
                parts.add(Map.of("inlineData", inlineData));
            }

            Map<String, Object> content = Map.of("parts", parts);
            Map<String, Object> body = Map.of(
                    "contents", List.of(content),
                    "generationConfig", Map.of(
                            "responseMimeType", "application/json",
                            "maxOutputTokens", MAX_OUTPUT_TOKENS)
            );
            return objectMapper.writeValueAsString(body);
        } catch (Exception e) {
            throw new IllegalStateException("Gemini 요청 본문 생성 실패", e);
        }
    }

    // 긴 변이 MAX_IMAGE_DIMENSION 이하면 그대로 두고, 넘으면 비율 유지한 채 축소해 JPEG로 다시 인코딩.
    // 리사이즈 자체가 실패(손상된 이미지 등)하면 원본 그대로 보낸다 - 이 기능은 분석 실패해도 사용자가
    // 직접 입력하면 되는 fail-open 보조 기능이라, 리사이즈 실패로 아예 막을 필요는 없음.
    private byte[] resizeIfNeeded(byte[] original) {
        try {
            BufferedImage source = ImageIO.read(new ByteArrayInputStream(original));
            if (source == null) {
                return original;
            }
            int width = source.getWidth();
            int height = source.getHeight();
            int longerSide = Math.max(width, height);
            if (longerSide <= MAX_IMAGE_DIMENSION) {
                return original;
            }

            double scale = (double) MAX_IMAGE_DIMENSION / longerSide;
            int targetWidth = Math.max(1, (int) Math.round(width * scale));
            int targetHeight = Math.max(1, (int) Math.round(height * scale));

            Image scaled = source.getScaledInstance(targetWidth, targetHeight, Image.SCALE_SMOOTH);
            BufferedImage resized = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);
            resized.getGraphics().drawImage(scaled, 0, 0, null);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageIO.write(resized, "jpg", out);
            return out.toByteArray();
        } catch (IOException e) {
            log.warn("차량 이미지 리사이즈 실패, 원본 그대로 전송: {}", e.getMessage());
            return original;
        }
    }

    private String buildPrompt(int imageCount) {
        String angleNote = imageCount > 1
                ? "같은 차량을 여러 각도(정면/측면/후면 등)에서 찍은 사진 " + imageCount + "장이 함께 첨부되어 있다. 모든 사진을 종합해서 판단해.\n"
                : "";
        return "다음은 모빌리티 박람회 부스에 전시할 차량 사진이다. " + angleNote
                + "사진을 보고 차량 스펙을 추정해서 "
                + "아래 JSON 스키마 형식으로만 응답해. 다른 설명이나 마크다운 없이 순수 JSON만 출력해.\n"
                + "사진만으로 정확히 알 수 없는 항목은 사진에서 합리적으로 추정하되, 전혀 판단할 근거가 없으면 "
                + "해당 필드는 null로 남겨줘 (지어내지 말 것).\n\n"
                + "{\n"
                + "  \"name\": \"차량명(모델명, 모를 경우 차종을 짧게 설명)\",\n"
                + "  \"brand\": \"제조사/브랜드\",\n"
                + "  \"category\": \"차량 카테고리 (예: 세단, SUV, 스포츠카, 전기 이륜차 등)\",\n"
                + "  \"tags\": [\"짧은 태그 문자열 배열, 예: 전기차, SUV\"],\n"
                + "  \"summary\": \"한 줄 요약 (30자 내외)\",\n"
                + "  \"description\": \"전시 소개용 상세 설명 (2~4문장)\",\n"
                + "  \"features\": \"주요 특징 (쉼표 또는 줄바꿈으로 구분된 텍스트)\",\n"
                + "  \"colors\": \"사진에서 보이는 차량 색상\",\n"
                + "  \"range\": \"1회 충전/주유 주행거리 (단위 포함 문자열, 예: '458 km')\",\n"
                + "  \"battery\": \"배터리 용량 (단위 포함 문자열, 예: '77.4 kWh'), 전기차가 아니면 null\",\n"
                + "  \"power\": \"최대 출력 (단위 포함 문자열, 예: '325 ps')\",\n"
                + "  \"drivetrain\": \"구동방식 (예: RWD, FWD, AWD)\",\n"
                + "  \"chargingType\": \"충전 방식 (예: DC 콤보, AC 완속), 전기차가 아니면 null\",\n"
                + "  \"chargingTime\": \"충전 시간 (단위 포함 문자열, 예: '18분(10~80%)'), 전기차가 아니면 null\",\n"
                + "  \"dimensions\": \"전장x전폭x전고 (단위 포함 문자열, 예: '4635x1890x1620mm')\",\n"
                + "  \"weight\": \"공차중량 (단위 포함 문자열, 예: '2100 kg')\",\n"
                + "  \"seatingCapacity\": \"승차 인원 (정수, 알 수 없으면 null)\"\n"
                + "}";
    }
}