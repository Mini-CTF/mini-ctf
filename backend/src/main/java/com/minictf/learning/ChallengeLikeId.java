package com.minictf.learning;

import java.io.Serializable;
import java.util.Objects;

public class ChallengeLikeId implements Serializable {
  private Long user;
  private Long challenge;

  public ChallengeLikeId() {}

  @Override
  public boolean equals(Object other) {
    if (this == other) return true;
    if (!(other instanceof ChallengeLikeId that)) return false;
    return Objects.equals(user, that.user) && Objects.equals(challenge, that.challenge);
  }

  @Override
  public int hashCode() {
    return Objects.hash(user, challenge);
  }
}
