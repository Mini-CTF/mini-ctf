package com.minictf.vault;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public final class VaultDtos {
  private VaultDtos() {}

  public record Mission(
      String id,
      String name,
      String description,
      int gemReward,
      int fragmentReward,
      boolean eligible,
      boolean completed) {}

  public record Cosmetic(
      String id,
      String name,
      String description,
      String type,
      String source,
      int gemCost,
      int fragmentCost,
      boolean hidden,
      boolean owned,
      boolean equipped) {}

  public record Summary(
      int gems, int fragments, List<Mission> missions, List<Cosmetic> cosmetics) {}

  public record IdRequest(@NotBlank @Size(max = 50) String id) {}
}
