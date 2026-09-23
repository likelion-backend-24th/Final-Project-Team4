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

    // 이 클라이언트가 만드는 응답(요약 불릿/이메일 본문/후기 3~4문장/박람회 소개문)은 전부 짧은 한국어 텍스트라
    // 800토큰이면 넉넉하다 - 상한 없이 무제한 출력을 막아 토큰 비용을 캡(2026-09-23, 절감 감사).
    private static final int MAX_OUTPUT_TOKENS = 800;

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

    @Override
    public Optional<String> polishReview(String reviewType, String vehicleName, String content) {
        return callGemini(buildPolishPrompt(reviewType, vehicleName, content));
    }

    @Override
    public Optional<String> draftExpoDescription(String title, String venue) {
        return callGemini(buildExpoDescriptionPrompt(title, venue));
    }

    private Optional<String> callGemini(String prompt) {
        if (apiKey == null || apiKey.isBlank()) {
            return Optional.empty();
        }

        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                String requestBody = objectMapper.writeValueAsString(Map.of(
                        "contents", new Object[]{Map.of("parts", new Object[]{Map.of("text", prompt)})},
                        "generationConfig", Map.of("maxOutputTokens", MAX_OUTPUT_TOKENS)));

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

    // 2026-09-18: 인사말/마무리 인사 생략은 "후기 초안"(buildReviewPrompt) 얘기였고, 이 고객 발송용
    // 이메일은 원래대로 인사말·마무리 인사 포함(정중한 이메일 본문 형태로).
    private String buildEmailPrompt(String customerName, String consultationNote) {
        return "다음은 모빌리티 박람회 참가업체 담당자가 부스에서 고객과 나눈 상담 내용을 현장에서 자유롭게 적은 메모다. "
                + "이 메모를 참가업체가 고객에게 보낼 이메일 본문으로 정리해줘.\n"
                + "형식(아래 구조를 그대로 따르되, 카테고리와 불릿 내용은 메모 내용에 맞게 자유롭게 구성):\n\n"
                + "안녕하세요, " + (customerName == null || customerName.isBlank() ? "고객" : customerName) + "님!\n"
                + "오늘 저희 부스에 방문해 주셔서 진심으로 감사합니다.\n"
                + "상담 나누었던 내용과 요청하신 사항들을 아래와 같이 정리해 드립니다.\n\n"
                + "📋 주요 상담 및 관심 사항 요약\n\n"
                + "* 카테고리1\n"
                + "   * 세부항목\n"
                + "* 카테고리2\n"
                + "   * 세부항목\n\n"
                + "추가로 궁금하신 점 있으시면 언제든 편하게 연락 주세요. 감사합니다.\n\n"
                + "다른 설명 없이 위 형식(인사말~마무리 인사 포함)의 이메일 본문만 출력해.\n\n"
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

    private String buildExpoDescriptionPrompt(String title, String venue){
        return "다음은 새로 등록하는 모빌리티 박람회의 이름이다."
                + "이 박람회를 소개하는 문구를 작성해줘. 고객이 박람회 목록·상세 페이지에서 보게 될 행사 소개문이야. "
                + "박람회명에서 유추할 수 있는 주제(전기차, 자율주행, 튜닝 등)와 분위기를 살려서, "
                + "과장된 광고 문구 없이 신뢰감 있게 2~3문장(200자 내외)으로 자연스럽게 작성해줘. "
                + "제목, 따옴표, 다른 설명 없이 소개 문구 본문만 출력해.\n\n"
                + "박람회명: " + title + "\n"
                + "장소: " + (venue == null || venue.isBlank() ? "미정" : venue);
    }

    // 고객이 쓴 후기를 다듬기만 한다 - 새 사실을 지어내지 않고, 1인칭·원래 의미·길이를 유지(불릿/제목/따옴표 없이 본문만).
    private String buildPolishPrompt(String reviewType, String vehicleName, String content) {
        String subject = "CONSULT".equals(reviewType)
                ? "차량 " + (vehicleName == null || vehicleName.isBlank() ? "" : vehicleName) + " 상담 후기"
                : "부스 방문 후기";

        return "다음은 모빌리티 박람회 방문객이 직접 쓴 " + subject + "다. "
                + "맞춤법과 띄어쓰기를 바로잡고 어색한 문장을 자연스럽게 다듬어줘. "
                + "종결어미는 '~요' 또는 '~습니다' 중 하나로 통일해서 존댓말 후기로 만들고, "
                + "'~음', '~함', '~됨' 같은 명사형 종결이나 '~당', 'ㅎㅎ' 같은 표현은 자연스러운 문장으로 바꿔줘. "
                + "글쓴이가 말한 내용과 사실, 1인칭 시점은 그대로 유지하고, 없는 내용을 새로 지어내거나 과장하지 마. "
                + "길이는 원문과 비슷하게 유지해. 제목, 불릿, 따옴표, 다른 설명 없이 다듬은 후기 본문만 출력해.\n\n"
                + "원문: " + content;
    }
}
