package com.minictf.user;

/** Score-based learning tier. Thresholds are intentionally centralized for easy balancing. */
public final class UserTier {
  private UserTier() {}

  public record Tier(String id, String name, int minimumScore) {}

  private static final Tier[] TIERS = {
    new Tier("beginner", "비기너", 0),
    new Tier("rookie", "루키", 300),
    new Tier("junior", "주니어", 1_000),
    new Tier("senior", "시니어", 2_500),
    new Tier("veteran", "베테랑", 4_000),
    new Tier("master", "마스터", 7_000),
    new Tier("root", "루트", 15_000)
  };

  public static Tier forScore(int score) {
    Tier current = TIERS[0];
    for (Tier tier : TIERS) {
      if (score < tier.minimumScore()) break;
      current = tier;
    }
    return current;
  }
}
