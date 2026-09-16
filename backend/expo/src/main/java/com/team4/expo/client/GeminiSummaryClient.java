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
        String prompt = buildPrompt(wantsPurchase, wantsTestDrive, interestedVehicle, hasDriverLicense, message);
        return callGemini(prompt);
    }

    @Override
    public Optional<String> summarizeForEmail(String customerName, String consultationNote) {
        String prompt = buildEmailPrompt(customerName, consultationNote);
        return callGemini(prompt);
    }

    @Override
    public Optional<String> draftReview(String reviewType, String vehicleName, String customerMessage, String exhibitorNote) {
        String prompt = buildReviewPrompt(reviewType, vehicleName, customerMessage, exhibitorNote);
        return callGemini(prompt);
    }

    private Optional<String> callGemini(String prompt) {
        if (apiKey == null || apiKey.isBlank()) {
            return Optional.empty();
        }

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

    // spec.md "이메일 초안 목표 포맷(2026-09-16 확정)" - 인사말/향후 안내 사항 제거, 이모지 헤더 카테고리 불릿 요약만.
    private String buildEmailPrompt(String customerName, String consultationNote) {
        return "다음은 모빌리티 박람회 참가업체 담당자가 부스에서 고객과 나눈 상담 내용을 현장에서 자유롭게 적은 메모다. "
                + "이 메모를 참가업체가 고객에게 보낼 상담 내용 요약으로 정리해줘.\n"
                + "형식(아래 구조를 그대로 따르되, 카테고리와 불릿 내용은 메모 내용에 맞게 자유롭게 구성):\n\n"
                + "📋 주요 상담 및 관심 사항 요약\n\n"
                + "* 카테고리1\n"
                + "   * 세부항목\n"
                + "* 카테고리2\n"
                + "   * 세부항목\n\n"
                + "인사말, 안내 문구, 마무리 인사는 넣지 말고 다른 설명 없이 위 형식의 요약 내용만 출력해.\n\n"
                + "상담 메모: " + (consultationNote == null || consultationNote.isBlank() ? "없음" : consultationNote);
    }

    // 고객 시점 후기 초안 - 1인칭으로, 실제 방문객이 남긴 후기처럼 자연스럽게(불릿 아님, 3~5문장 정도).
    private String buildReviewPrompt(String reviewType, String vehicleName, String customerMessage, String exhibitorNote) {
        String focus = "CONSULT".equals(reviewType)
                ? "차량 " + (vehicleName == null || vehicleName.isBlank() ? "" : vehicleName) + "에 대한 상담 경험 위주로"
                : "부스 방문 경험 전반 위주로";

        return "다음은 모빌리티 박람회에서 고객이 신청했던 상담 요구사항과, 그 상담 현장에서 참가업체 담당자가 남긴 메모다. "
                + "이 둘을 참고해서 그 고객이 직접 쓴 것처럼 1인칭 방문 후기를 " + focus + " 3~4문장으로 자연스럽게 작성해줘. "
                + "과장된 광고 문구 없이 실제 방문 후기 톤으로, 다른 설명 없이 후기 본문만 출력해.\n\n"
                + "고객이 신청 시 남긴 요구사항: " + (customerMessage == null || customerMessage.isBlank() ? "없음" : customerMessage) + "\n"
                + "참가업체 담당자의 현장 상담 메모: " + (exhibitorNote == null || exhibitorNote.isBlank() ? "없음" : exhibitorNote);
    }
}
