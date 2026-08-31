package com.minictf.assistant;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.minictf.challenge.Challenge;
import com.minictf.challenge.ChallengeRepository;
import com.minictf.common.RateLimitService;
import jakarta.persistence.EntityNotFoundException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AssistantService {
  private static final Logger log = LoggerFactory.getLogger(AssistantService.class);
  private static final String ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/";
  private static final String SAFE_REPLY_KO =
      "정답 FLAG나 완성된 풀이를 직접 제공할 수는 없어요. 문제 설명에서 목표와 입력값을 다시 확인한 뒤, 막힌 지점을 한 단계씩 질문해 보세요.";
  private static final String SAFE_REPLY_EN =
      "I cannot provide a FLAG or a complete solution. Check the goal and input in the brief, then ask about the exact step where you are stuck.";

  private final ChallengeRepository challenges;
  private final RateLimitService rateLimits;
  private final ObjectMapper objectMapper;
  private final String apiKey;
  private final String primaryModel;
  private final String fallbackModel;
  private final HttpClient httpClient;

  public AssistantService(
      ChallengeRepository challenges,
      RateLimitService rateLimits,
      ObjectMapper objectMapper,
      @Value("${GEMINI_API_KEY:}") String apiKey,
      @Value("${GEMINI_MODEL:gemini-3.7-flash}") String primaryModel,
      @Value("${GEMINI_FALLBACK_MODEL:gemini-3.5-flash-lite}") String fallbackModel) {
    this.challenges = challenges;
    this.rateLimits = rateLimits;
    this.objectMapper = objectMapper;
    this.apiKey = apiKey;
    this.primaryModel = normalizeModel(primaryModel);
    this.fallbackModel = normalizeModel(fallbackModel);
    this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(6)).build();
  }

  public AssistantDtos.ChatReply reply(String username, AssistantDtos.ChatRequest request) {
    boolean korean = !"en".equalsIgnoreCase(request.language());
    rateLimits.check("assistant-chat", username, 12, 600);
    if (apiKey.isBlank()) throw new AssistantUnavailableException();
    if (asksForRestrictedAnswer(request.message()))
      return new AssistantDtos.ChatReply(korean ? SAFE_REPLY_KO : SAFE_REPLY_EN, contextLabel(request.challengeId()));

    Challenge challenge = request.challengeId() == null ? null : findChallenge(request.challengeId());
    String response = callModel(primaryModel, systemPrompt(korean, challenge), request.message(), request.history());
    if (response == null && !fallbackModel.equals(primaryModel))
      response = callModel(fallbackModel, systemPrompt(korean, challenge), request.message(), request.history());
    if (response == null || response.isBlank()) throw new AssistantUnavailableException();
    return new AssistantDtos.ChatReply(response.trim(), challenge == null ? null : challenge.getTitle());
  }

  private Challenge findChallenge(Long id) {
    return challenges.findById(id).orElseThrow(() -> new EntityNotFoundException("Challenge not found"));
  }

  private String contextLabel(Long challengeId) {
    return challengeId == null ? null : challenges.findById(challengeId).map(Challenge::getTitle).orElse(null);
  }

  private static String normalizeModel(String model) {
    return switch (model) {
      case "gemini-2.5-flash" -> "gemini-3.7-flash";
      case "gemini-2.5-flash-lite" -> "gemini-3.5-flash-lite";
      default -> model;
    };
  }

  private String systemPrompt(boolean korean, Challenge challenge) {
    String language = korean ? "Reply in natural Korean." : "Reply in clear English.";
    String context =
        challenge == null
            ? "No specific challenge is open."
            : "Current challenge: title="
                + challenge.getTitle()
                + ", category="
                + challenge.getCategory()
                + ", difficulty="
                + challenge.getDifficulty()
                + ", brief="
                + challenge.getDescription();
    return "You are FlagBox Coach, a warm beginner-focused cybersecurity learning assistant. "
        + language
        + " For a greeting or short check-in, reply warmly in one or two sentences and offer Web, Forensics, or Reversing as choices. "
        + " For learning questions, begin with a plain-language explanation, then give at most three small numbered next steps. "
        + " Define unfamiliar terms immediately and avoid jargon, long disclaimers, and generic filler. Ask one useful follow-up question when context is missing. "
        + " Keep the response concise enough to scan in a chat panel. Teach concepts, safe tools, and how to read clues. "
        + "Never reveal a FLAG, exact final answer, complete exploit payload, or a full solve path. "
        + "Do not provide instructions for attacking real systems; keep examples limited to the FlagBox exercise. "
        + "If asked for restricted content, politely redirect to a conceptual hint. "
        + context;
  }

  private String callModel(
      String model, String system, String message, List<AssistantDtos.ChatTurn> history) {
    try {
      List<Map<String, Object>> contents = new ArrayList<>();
      if (history != null) {
        for (AssistantDtos.ChatTurn turn : history) {
          String role = "assistant".equals(turn.role()) ? "model" : "user";
          contents.add(Map.of("role", role, "parts", List.of(Map.of("text", turn.content()))));
        }
      }
      contents.add(Map.of("role", "user", "parts", List.of(Map.of("text", message))));
      String payload =
          objectMapper.writeValueAsString(
              Map.of(
                  "systemInstruction", Map.of("parts", List.of(Map.of("text", system))),
                  "contents", contents,
                  "generationConfig", Map.of("temperature", 0.35, "maxOutputTokens", 420)));
      HttpRequest request =
          HttpRequest.newBuilder(URI.create(ENDPOINT + model + ":generateContent"))
              .timeout(Duration.ofSeconds(12))
              .header("x-goog-api-key", apiKey)
              .header("Content-Type", "application/json")
              .header("Accept", "application/json")
              .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
              .build();
      HttpResponse<String> response =
          httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        log.warn("Gemini assistant request failed with HTTP status {} for model {}", response.statusCode(), model);
        return null;
      }
      JsonNode root = objectMapper.readTree(response.body());
      return root.path("candidates").path(0).path("content").path("parts").path(0).path("text").asText(null);
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      log.warn("Gemini assistant request was interrupted");
      return null;
    } catch (Exception exception) {
      log.warn("Gemini assistant request failed: {}", exception.getClass().getSimpleName());
      return null;
    }
  }

  private boolean asksForRestrictedAnswer(String message) {
    String value = message.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    return value.contains("ctf{")
        || value.contains("flag 알려")
        || value.contains("flag 줘")
        || value.contains("정답 알려")
        || value.contains("정답만")
        || value.contains("답만")
        || value.contains("complete exploit")
        || value.contains("give me the flag")
        || value.contains("give me the answer");
  }

  public static class AssistantUnavailableException extends RuntimeException {}
}
