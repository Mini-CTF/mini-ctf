package com.minictf.assistant;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;

public final class AssistantDtos {
  private AssistantDtos() {}

  public record ChatRequest(
      @NotBlank @Size(max = 1200) String message,
      @Positive Long challengeId,
      @Size(max = 5) String language,
      List<ChatTurn> history) {}

  public record ChatTurn(String role, String content) {}

  public record ChatReply(String message, String contextLabel) {}

  public record FeedbackRequest(@Min(1) @Max(5) int rating, @Size(max = 1000) String comment) {}

  public record FeedbackView(
      Long id,
      String username,
      String nickname,
      int rating,
      String comment,
      java.time.Instant createdAt) {}
}
