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
      boolean equipped,
      boolean consumable) {}

  public record Summary(
      int gems,
      int fragments,
      int hintCredits,
      List<String> dailyShopIds,
      List<Mission> missions,
      List<Cosmetic> cosmetics) {}

  public record HiddenMission(
      String id, String name, String description, boolean eligible, boolean completed) {}

  public record HiddenSummary(
      boolean unlocked, boolean rewarded, List<HiddenMission> missions, List<Cosmetic> rewards) {}

  public record IdRequest(@NotBlank @Size(max = 50) String id) {}
}
