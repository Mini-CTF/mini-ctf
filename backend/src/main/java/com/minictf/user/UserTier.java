package com.minictf.user;

import java.util.List;

/** Score-based learning tier. Thresholds are intentionally centralized for easy balancing. */
public final class UserTier {
  private UserTier() {}

  public record Tier(String id, String name, int minimumScore) {}

  private static final Tier[] TIERS = {
    new Tier("beginner", "Beginner", 0),
    new Tier("rookie", "Rookie", 300),
    new Tier("junior", "Junior", 1_000),
    new Tier("senior", "Senior", 2_500),
    new Tier("veteran", "Veteran", 4_000),
    new Tier("master", "Master", 7_000),
    new Tier("root", "Root", 15_000)
  };

  public static Tier forScore(int score) {
    Tier current = TIERS[0];
    for (Tier tier : TIERS) {
      if (score < tier.minimumScore()) break;
      current = tier;
    }
    return current;
  }

  public static List<Tier> all() {
    return List.of(TIERS);
  }
}
