package com.minictf.assistant;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import jakarta.validation.Valid;
import java.util.List;

public final class AssistantDtos {
  private AssistantDtos() {}

  public record ChatRequest(
      @NotBlank @Size(max = 1200) String message,
      @Positive Long challengeId,
      @Size(max = 5) String language,
      @Size(max = 6) List<@Valid ChatTurn> history) {}

  public record ChatTurn(
      @NotBlank @Size(max = 10) String role, @NotBlank @Size(max = 1200) String content) {}

  public record ChatReply(String message, String contextLabel) {}
}
