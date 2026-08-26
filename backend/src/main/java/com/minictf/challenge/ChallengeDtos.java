package com.minictf.challenge;

import jakarta.validation.constraints.*;
import java.time.Instant;

public final class ChallengeDtos {
  private ChallengeDtos() {}

  public record Summary(
      Long id,
      String title,
      String category,
      String difficulty,
      int score,
      boolean solved,
      boolean artifactAvailable) {}

  public record Detail(
      Long id,
      String title,
      String description,
      String category,
      String difficulty,
      int score,
      boolean solved,
      boolean artifactAvailable,
      boolean hintAvailable,
      int hintCost) {}

  public record HintView(String hint, int remainingCredits) {}

  public record SubmitRequest(@NotBlank @Size(max = 200) String flag) {}

  public record SubmitResult(String result, int awardedScore) {}

  public record ActivityRequest(
      @NotBlank @Pattern(regexp = "OPENED|FOCUS_LOST|FOCUS_RESTORED") String type) {}

  public record AdminRequest(
      @NotBlank @Size(max = 160) String title,
      @NotBlank @Size(max = 20_000) String description,
      @NotBlank @Pattern(regexp = "(?i)WEB|FORENSIC|REVERSING") String category,
      @NotBlank @Pattern(regexp = "(?i)BEGINNER|EASY|NORMAL|ADVANCED|EXPERT") String difficulty,
      @Min(1) @Max(1_000_000) int score,
      @Size(max = 200) String flag,
      @Size(max = 500) String artifactPath,
      boolean active,
      @Size(max = 2_000) String hintText,
      @Min(1) @Max(100) int hintCost) {
    public AdminRequest(
        String title,
        String description,
        String category,
        String difficulty,
        int score,
        String flag,
        String artifactPath,
        boolean active) {
      this(title, description, category, difficulty, score, flag, artifactPath, active, null, 1);
    }
  }

  public record AdminView(
      Long id,
      String title,
      String description,
      String category,
      String difficulty,
      int score,
      String artifactPath,
      boolean active,
      boolean flagConfigured,
      Instant createdAt,
      Instant updatedAt) {}

  public record ArtifactView(String filename, long sizeBytes) {}
}
