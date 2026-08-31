package com.minictf.assistant;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public final class AssistantDtos {
  private AssistantDtos() {}

  public record ChatRequest(
      @NotBlank @Size(max = 1200) String message,
      @Positive Long challengeId,
      @Size(max = 5) String language) {}

  public record ChatReply(String message, String contextLabel) {}
}
