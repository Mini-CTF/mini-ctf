package com.minictf.assistant;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.minictf.challenge.Challenge;
import com.minictf.challenge.ChallengeRepository;
import com.minictf.common.RateLimitService;
import com.minictf.user.UserRepository;
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
import org.springframework.transaction.annotation.Transactional;

@Service
public class AssistantService {
  private static final Logger log = LoggerFactory.getLogger(AssistantService.class);
  private static final String ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/";
  private static final String SAFE_REPLY_KO =
      "정답 FLAG나 완성된 풀이를 직접 제공할 수는 없어요. 문제 설명에서 목표와 입력값을 다시 확인한 뒤, 막힌 지점을 한 단계씩 질문해 보세요.";
  private static final String SAFE_REPLY_EN =
      "I cannot provide a FLAG or a complete solution. Check the goal and input in the brief, then ask about the exact step where you are stuck.";

  private final ChallengeRepository challenges;
  private final UserRepository users;
  private final AssistantFeedbackRepository feedback;
  private final RateLimitService rateLimits;
  private final ObjectMapper objectMapper;
  private final String apiKey;
  private final String primaryModel;
  private final String fallbackModel;
  private final HttpClient httpClient;

  public AssistantService(
      ChallengeRepository challenges,
      UserRepository users,
      AssistantFeedbackRepository feedback,
      RateLimitService rateLimits,
      ObjectMapper objectMapper,
      @Value("${GEMINI_API_KEY:}") String apiKey,
      @Value("${GEMINI_MODEL:gemini-3.7-flash}") String primaryModel,
      @Value("${GEMINI_FALLBACK_MODEL:gemini-3.5-flash-lite}") String fallbackModel) {
    this.challenges = challenges;
    this.users = users;
    this.feedback = feedback;
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
    if (apiKey.isBlank()) {
      log.warn("Gemini API key is not configured; using the FlagBox learning fallback");
      return new AssistantDtos.ChatReply(
          fallbackReply(korean, request.message(), request.challengeId()),
          contextLabel(request.challengeId()));
    }
    if (asksForRestrictedAnswer(request.message()))
      return new AssistantDtos.ChatReply(
          korean ? SAFE_REPLY_KO : SAFE_REPLY_EN, contextLabel(request.challengeId()));

    Challenge challenge =
        request.challengeId() == null ? null : findChallenge(request.challengeId());
    String response =
        callModel(
            primaryModel, systemPrompt(korean, challenge), request.message(), request.history());
    if (response == null && !fallbackModel.equals(primaryModel))
      response =
          callModel(
              fallbackModel, systemPrompt(korean, challenge), request.message(), request.history());
    if (response == null || response.isBlank()) {
      log.warn("Gemini models were unavailable; using the FlagBox learning fallback");
      response = fallbackReply(korean, request.message(), request.challengeId());
    }
    return new AssistantDtos.ChatReply(
        response.trim(), challenge == null ? null : challenge.getTitle());
  }

  public void saveFeedback(String username, AssistantDtos.FeedbackRequest request) {
    AssistantFeedback item = new AssistantFeedback();
    item.setUser(users.findByUsernameIgnoreCase(username).orElseThrow());
    item.setRating(request.rating());
    item.setComment(
        request.comment() == null || request.comment().isBlank() ? null : request.comment().trim());
    feedback.save(item);
  }

  @Transactional(readOnly = true)
  public List<AssistantDtos.FeedbackView> feedback() {
    return feedback.findTop100ByOrderByCreatedAtDesc().stream()
        .map(
            item ->
                new AssistantDtos.FeedbackView(
                    item.getId(),
                    item.getUser().getUsername(),
                    item.getUser().getNickname(),
                    item.getRating(),
                    item.getComment(),
                    item.getCreatedAt()))
        .toList();
  }

  private Challenge findChallenge(Long id) {
    return challenges
        .findById(id)
        .orElseThrow(() -> new EntityNotFoundException("Challenge not found"));
  }

  private String contextLabel(Long challengeId) {
    return challengeId == null
        ? null
        : challenges.findById(challengeId).map(Challenge::getTitle).orElse(null);
  }

  private String fallbackReply(boolean korean, String message, Long challengeId) {
    Challenge challenge =
        challengeId == null ? null : challenges.findById(challengeId).orElse(null);
    String category = challenge == null ? null : challenge.getCategory();
    String title = challenge == null ? null : challenge.getTitle();
    String tools =
        switch (category == null ? "" : category) {
          case "WEB" ->
              korean
                  ? "브라우저 개발자 도구(F12)의 Elements·Network 탭"
                  : "browser developer tools (Elements and Network)";
          case "FORENSIC" ->
              korean
                  ? "텍스트 검색과 CyberChef 또는 파일 분석 도구"
                  : "text search plus CyberChef or a file-analysis tool";
          case "REVERSING" -> korean ? "텍스트 편집기와 Python" : "a text editor and Python";
          case "CRYPTO" ->
              korean ? "CyberChef와 Python 또는 계산기" : "CyberChef plus Python or a calculator";
          case "MISC" -> korean ? "텍스트 편집기와 CyberChef" : "a text editor and CyberChef";
          default -> korean ? "문제 설명과 무료 힌트" : "the challenge brief and free hint";
        };
    String focus =
        message == null || message.isBlank()
            ? (korean ? "문제의 설명" : "the challenge brief")
            : message.trim();
    if (korean) {
      return (title == null ? "" : "현재 문제: " + title + "\n")
          + "다음 순서로 시작해 보세요.\n"
          + "1. "
          + focus
          + "에서 형식·파일명·반복되는 단서를 표시하세요.\n"
          + "2. "
          + tools
          + "로 가장 단순한 확인부터 해 보세요.\n"
          + "3. 결과가 예상과 다르면 한 단계만 되돌아가 무료 힌트와 비교하세요.";
    }
    return (title == null ? "" : "Current challenge: " + title + "\n")
        + "Try this small, safe starting plan.\n"
        + "1. Mark formats, file names, and repeated clues in "
        + focus
        + ".\n"
        + "2. Start with "
        + tools
        + ".\n"
        + "3. If the result is unexpected, step back once and compare it with the free hint.";
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
        + " You can handle natural everyday conversation and general computing or cybersecurity study questions, not only CTF questions. "
        + " FlagBox currently has five wargame categories: Web, Forensics, Reversing, Cryptography, and Miscellaneous. "
        + catalogueSummary()
        + " For a greeting or short check-in, reply warmly in one or two sentences and offer those five categories as study choices. "
        + " The platform no longer has a shop, rubies, cosmetic purchases, or paid hint credits; hints are free. Do not suggest any removed shop or currency system. "
        + " For learning questions, begin with a plain-language explanation, then give at most three small numbered next steps. "
        + " Define unfamiliar terms immediately and avoid jargon, long disclaimers, generic filler, or small talk. "
        + " Prioritize answering the user's actual question and offering a usable next action. "
        + " Do not end with a follow-up question by default. Ask exactly one concise clarification only when a missing detail is essential to give a safe or accurate answer; otherwise make a reasonable beginner-friendly assumption and state it briefly. "
        + " Keep the response concise enough to scan in a chat panel. Teach concepts, safe tools, and how to read clues. "
        + "Never reveal a FLAG, exact final answer, complete exploit payload, or a full solve path. "
        + "Do not provide instructions for attacking real systems; keep examples limited to the FlagBox exercise. "
        + "If asked for restricted content, politely redirect to a conceptual hint. "
        + context;
  }

  private String catalogueSummary() {
    Map<String, Long> counts = new java.util.TreeMap<>();
    for (Challenge item : challenges.findAll()) {
      counts.merge(item.getCategory(), 1L, Long::sum);
    }
    String breakdown =
        counts.entrySet().stream()
            .map(item -> item.getKey() + "=" + item.getValue())
            .reduce((left, right) -> left + ", " + right)
            .orElse("no challenges published yet");
    return " Current published challenge catalogue: "
        + challenges.count()
        + " total ("
        + breakdown
        + "). ";
  }

  private String callModel(
      String model, String system, String message, List<AssistantDtos.ChatTurn> history) {
    try {
      List<Map<String, Object>> contents = new ArrayList<>();
      if (history != null) {
        for (AssistantDtos.ChatTurn turn : history) {
          if (turn == null || turn.content() == null || turn.content().isBlank()) continue;
          String role = "assistant".equals(turn.role()) ? "model" : "user";
          String content = turn.content().trim();
          contents.add(
              Map.of(
                  "role",
                  role,
                  "parts",
                  List.of(Map.of("text", content.substring(0, Math.min(content.length(), 1200))))));
          // Keep enough context for a natural conversation without making every
          // request unnecessarily slow.
          if (contents.size() == 4) break;
        }
      }
      contents.add(Map.of("role", "user", "parts", List.of(Map.of("text", message))));
      String payload =
          objectMapper.writeValueAsString(
              Map.of(
                  "systemInstruction", Map.of("parts", List.of(Map.of("text", system))),
                  "contents", contents,
                  "generationConfig", Map.of("temperature", 0.35, "maxOutputTokens", 720)));
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
        log.warn(
            "Gemini assistant request failed with HTTP status {} for model {}",
            response.statusCode(),
            model);
        return null;
      }
      JsonNode root = objectMapper.readTree(response.body());
      JsonNode parts = root.path("candidates").path(0).path("content").path("parts");
      if (!parts.isArray()) return null;
      StringBuilder text = new StringBuilder();
      for (JsonNode part : parts) {
        String value = part.path("text").asText("");
        if (!value.isBlank()) text.append(value);
      }
      return text.isEmpty() ? null : text.toString();
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
