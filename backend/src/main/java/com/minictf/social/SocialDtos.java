package com.minictf.social;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public final class SocialDtos {
  private SocialDtos() {}

  public record FriendView(
      String username,
      String nickname,
      String statusMessage,
      String avatarUrl,
      String relationshipStatus,
      boolean incomingRequest,
      Instant requestedAt) {}

  public record MessageRequest(@NotBlank @Size(max = 2000) String content) {}

  public record MessageView(
      Long id, String sender, String recipient, String content, Instant createdAt, boolean read) {}
}
