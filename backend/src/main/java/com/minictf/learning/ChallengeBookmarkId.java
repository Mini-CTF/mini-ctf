package com.minictf.learning;

import java.io.Serializable;
import java.util.Objects;

public class ChallengeBookmarkId implements Serializable {
  private Long user;
  private Long challenge;

  public ChallengeBookmarkId() {}

  public ChallengeBookmarkId(Long user, Long challenge) {
    this.user = user;
    this.challenge = challenge;
  }

  @Override
  public boolean equals(Object other) {
    if (this == other) return true;
    if (!(other instanceof ChallengeBookmarkId that)) return false;
    return Objects.equals(user, that.user) && Objects.equals(challenge, that.challenge);
  }

  @Override
  public int hashCode() {
    return Objects.hash(user, challenge);
  }
}
