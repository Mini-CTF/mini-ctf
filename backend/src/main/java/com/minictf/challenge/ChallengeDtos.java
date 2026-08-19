package com.minictf.challenge;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public final class ChallengeDtos {
    private ChallengeDtos() {}
    public record Summary(Long id, String title, String category, String difficulty, int score, boolean solved) {}
    public record Detail(Long id, String title, String description, String category, String difficulty, int score, boolean active, boolean solved, boolean artifactAvailable) {}
    public record SubmitRequest(@NotBlank @Size(max = 200) String flag) {}
    public record SubmitResult(String result, int awardedScore) {}
    public record AdminRequest(@NotBlank String title, @NotBlank String description, @NotBlank String category,
                               @NotBlank String difficulty, @Min(1) int score, @NotBlank String flag,
                               String artifactPath, boolean active) {}
}
