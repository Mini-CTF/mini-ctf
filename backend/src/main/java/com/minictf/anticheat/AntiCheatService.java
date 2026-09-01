package com.minictf.anticheat;

import com.minictf.challenge.Challenge;
import com.minictf.challenge.SubmissionRepository;
import com.minictf.user.User;
import java.time.Duration;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AntiCheatService {
  private final ChallengeActivityEventRepository activities;
  private final AntiCheatEventRepository events;
  private final SubmissionRepository submissions;

  public AntiCheatService(
      ChallengeActivityEventRepository activities,
      AntiCheatEventRepository events,
      SubmissionRepository submissions) {
    this.activities = activities;
    this.events = events;
    this.submissions = submissions;
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
          case "BEGINNER" -> 10;
          case "EASY" -> 20;
          case "NORMAL" -> 60;
          case "ADVANCED" -> 120;
          default -> 180;
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

  @Transactional
  public void assessIncorrectSubmission(User user, Challenge challenge) {
    long attempts =
        submissions.countByUserIdAndChallengeIdAndCorrectFalseAndSubmittedAtGreaterThanEqual(
            user.getId(), challenge.getId(), java.time.Instant.now().minus(Duration.ofMinutes(5)));
    if (attempts >= 10)
      recordOnce(
          user,
          challenge,
          "REPEATED_INVALID_FLAGS",
          "MEDIUM",
          "Ten or more incorrect FLAG submissions were recorded within five minutes.");
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
