package com.minictf.anticheat;

import com.minictf.challenge.Challenge;
import com.minictf.user.User;
import java.time.Duration;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AntiCheatService {
  private final ChallengeActivityEventRepository activities;
  private final AntiCheatEventRepository events;

  public AntiCheatService(
      ChallengeActivityEventRepository activities, AntiCheatEventRepository events) {
    this.activities = activities;
    this.events = events;
  }

  @Transactional
  public void recordActivity(User user, Challenge challenge, String type, String ip) {
    ChallengeActivityEvent event = new ChallengeActivityEvent();
    event.setUser(user);
    event.setChallenge(challenge);
    event.setActivityType(type);
    event.setIpAddress(ip);
    activities.save(event);
  }

  @Transactional
  public void assessCorrectSubmission(User user, Challenge challenge) {
    var firstActivity =
        activities.findTopByUserIdAndChallengeIdOrderByOccurredAtAsc(
            user.getId(), challenge.getId());
    if (firstActivity.isEmpty()) {
      recordOnce(
          user,
          challenge,
          "SOLVE_WITHOUT_ACTIVITY",
          "MEDIUM",
          "Correct FLAG was submitted without an in-app challenge activity record.");
      return;
    }
    long elapsedSeconds =
        Duration.between(firstActivity.get().getOccurredAt(), java.time.Instant.now()).toSeconds();
    long minimumSeconds =
        switch (challenge.getDifficulty()) {
          case "EASY" -> 20;
          case "MEDIUM" -> 60;
          default -> 120;
        };
    if (elapsedSeconds < minimumSeconds) {
      recordOnce(
          user,
          challenge,
          "RAPID_SOLVE",
          "LOW",
          "Correct FLAG submitted "
              + elapsedSeconds
              + " seconds after the first recorded activity.");
    }
  }

  private void recordOnce(
      User user, Challenge challenge, String type, String severity, String detail) {
    if (events.existsByUserIdAndChallengeIdAndEventType(user.getId(), challenge.getId(), type))
      return;
    AntiCheatEvent event = new AntiCheatEvent();
    event.setUser(user);
    event.setChallenge(challenge);
    event.setEventType(type);
    event.setSeverity(severity);
    event.setDetail(detail);
    events.save(event);
  }
}
