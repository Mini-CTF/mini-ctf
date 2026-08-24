package com.minictf.community;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;

public final class CommunityDtos {
  private CommunityDtos() {}

  public record PageView<T>(
      List<T> content, int page, int size, long totalElements, int totalPages) {}

  public record PostRequest(
      @NotBlank @Size(max = 200) String title,
      @NotBlank @Size(max = 20_000) String content,
      @NotBlank @Pattern(regexp = "(?i)FREE|QUESTION|CTF|NOTICE") String category) {}

  public record PostSummary(
      Long id,
      String title,
      String category,
      String author,
      String authorNickname,
      String authorTitle,
      int viewCount,
      long commentCount,
      long likeCount,
      long dislikeCount,
      long recommendCount,
      List<String> viewerReactions,
      Instant createdAt,
      Instant updatedAt) {}

  public record PostDetail(
      Long id,
      String title,
      String content,
      String category,
      String author,
      String authorNickname,
      String authorTitle,
      int viewCount,
      long commentCount,
      long likeCount,
      long dislikeCount,
      long recommendCount,
      List<String> viewerReactions,
      boolean editable,
      Instant createdAt,
      Instant updatedAt) {}

  public record CommentRequest(
      @NotBlank @Size(max = 2_000) String content, @Positive Long parentId) {}

  public record ReactionRequest(
      @NotBlank @Pattern(regexp = "(?i)LIKE|DISLIKE|RECOMMEND") String reaction) {}

  public record PostCommentView(
      Long id,
      String content,
      String author,
      String authorNickname,
      String authorTitle,
      boolean editable,
      Long parentId,
      boolean pinned,
      Instant createdAt,
      Instant updatedAt) {}

  public record ChallengeCommentRequest(
      @NotBlank @Size(max = 2_000) String content,
      @NotBlank @Pattern(regexp = "(?i)GENERAL|SOLVER") String discussionType) {}

  public record ChallengeCommentView(
      Long id,
      String content,
      String discussionType,
      String author,
      String authorNickname,
      String authorTitle,
      boolean editable,
      Instant createdAt,
      Instant updatedAt) {}
}
