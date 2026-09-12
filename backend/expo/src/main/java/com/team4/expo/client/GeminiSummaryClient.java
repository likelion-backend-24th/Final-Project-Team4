package com.team4.expo.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

// Google Gemini API로 상담 신청 요약. 부가 기능(fail-open) - 키 미설정/호출 실패 시 조용히 Optional.empty().
@Component
public class GeminiSummaryClient implements AiSummaryClient {

    private static final Logger log = LoggerFactory.getLogger(GeminiSummaryClient.class);

    private final String apiKey;
    private final String model;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public GeminiSummaryClient(@Value("${gemini.api-key}") String apiKey,
                                @Value("${gemini.model}") String model,
                                ObjectMapper objectMapper) {
        this.apiKey = apiKey;
        this.model = model;
        this.objectMapper = objectMapper;
    }

    // 과부하(503)/트래픽 제한(429)은 보통 잠깐이면 풀려서 한 번만 재시도한다. 그 외 실패는 재시도해도 의미 없어 바로 포기.
    private static final int MAX_ATTEMPTS = 2;

    @Override
    public Optional<String> summarizeConsultation(boolean wantsPurchase, boolean wantsTestDrive,
                                                    String interestedVehicle, boolean hasDriverLicense, String message) {
        if (apiKey == null || apiKey.isBlank()) {
            return Optional.empty();
        }

        String prompt = buildPrompt(wantsPurchase, wantsTestDrive, interestedVehicle, hasDriverLicense, message);

        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                String requestBody = objectMapper.writeValueAsString(Map.of(
                        "contents", new Object[]{Map.of("parts", new Object[]{Map.of("text", prompt)})}));

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent"))
                        .header("Content-Type", "application/json")
                        .header("x-goog-api-key", apiKey)
                        .timeout(Duration.ofSeconds(10))
                        .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() != 200) {
                    boolean retryable = response.statusCode() == 503 || response.statusCode() == 429;
                    log.warn("Gemini 요약 호출 실패 (status={}, attempt={}/{}): {}",
                            response.statusCode(), attempt, MAX_ATTEMPTS, response.body());
                    if (retryable && attempt < MAX_ATTEMPTS) {
                        Thread.sleep(1000);
                        continue;
                    }
                    return Optional.empty();
                }

                JsonNode root = objectMapper.readTree(response.body());
                String text = root.path("candidates").path(0).path("content").path("parts").path(0).path("text").asText(null);
                return text == null || text.isBlank() ? Optional.empty() : Optional.of(text.trim());
            } catch (IOException | InterruptedException e) {
                log.warn("Gemini 요약 호출 중 오류: {}", e.getMessage());
                return Optional.empty();
            }
        }
        return Optional.empty();
    }

    private String buildPrompt(boolean wantsPurchase, boolean wantsTestDrive, String interestedVehicle,
                                boolean hasDriverLicense, String message) {
        StringBuilder types = new StringBuilder();
        if (wantsPurchase) types.append("구매");
        if (wantsTestDrive) {
            if (!types.isEmpty()) types.append("+");
            types.append("시승");
        }

        return "다음은 모빌리티 박람회 참가업체에게 들어온 고객 상담 신청 내용이다. "
                + "참가업체 담당자가 한눈에 파악할 수 있도록 한국어 불릿 목록으로 정리해줘.\n"
                + "형식 예시(카테고리와 세부항목은 아래 상담 내용에 맞게 자유롭게 구성):\n"
                + "* 카테고리1\n"
                + "   * 세부항목: 내용\n"
                + "   * 세부항목: 내용\n"
                + "* 카테고리2\n"
                + "   * 세부항목: 내용\n\n"
                + "다른 설명 없이 위 형식의 요약 내용만 출력해.\n\n"
                + "상담 유형: " + types + "\n"
                + "관심 차종: " + (interestedVehicle == null || interestedVehicle.isBlank() ? "미입력" : interestedVehicle) + "\n"
                + "시승 시 운전면허 소지: " + (wantsTestDrive ? (hasDriverLicense ? "소지" : "미소지") : "해당없음") + "\n"
                + "기타 요청사항: " + (message == null || message.isBlank() ? "없음" : message);
    }
}
